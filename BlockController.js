const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./Block.js');
const BlockChain = require('./BlockChain.js');
const BitcoinMessage = require('bitcoinjs-message'); 
const hex2ascii = require('hex2ascii');

const MEG_POST_FIX = 'starRegistry';
const INVALID_STATUS_CODE = 400;
/**
 * Controller Definition to encapsulate routes to work with blocks
 */
class BlockController {

    /**
     * Constructor to create a new BlockController, you need to initialize here all your endpoints
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.timeoutRequestsWindowTime = 5 * 60 * 1000;
        this.blocks = [];
        this.mempool = new Map();
        this.mempoolValid = new Map();
        this.timeRequests = new Map();
        this.initializeMockData();
        this.postNewBlock();
        this.postRequestValidation();
        this.postMessageSignatureValidate();
        this.getStarsHash();
        this.getStartsWalletAddress();
        this.getStarByHeight();
        this.blockChainServie = new BlockChain.Blockchain();
    }

    /**
     * Implement a POST endpoint to submit a validation request 
     */
    postRequestValidation(){
        this.app.post("/requestValidation", (req, res) =>{
            if(req.body.address){
                // whether it is in timeout scope
                if(this.timeRequests.get(req.body.address)){
                    // check mempool and return it 
                    // getting validation Window 
                    let validationWindow = this.calculateValidationWindow(req);
                    let response = this.mempool.get(req.body.address);
                    response.validationWindow = validationWindow;
                    res.json(response);
                }else{
                    // process a new request 
                    this.addRequestValidation(req.body.address);
                    // getting validation Window 
                    let validationWindow = this.calculateValidationWindow(req);
                    let response = this.getRequestObject(req, validationWindow);
                    // store in mempool based on address
                    this.mempool.set(req.body.address, response);
                    res.json(response);
                }
            }else{
                res.status(INVALID_STATUS_CODE);
                res.json({error: "invalid address"});
            }
        });
    }

    /**
     * Implement /message-signature/validate API to vlaidte the given signature with address wallet by bitcoin library
     */
    postMessageSignatureValidate(){
        this.app.post('/message-signature/validate', (req, res) => {
            if(req.body.address && req.body.signature){
                // verify window time
                if(!this.verifyWidnowTime(req.body)){
                    this.sendErrorMessage(INVALID_STATUS_CODE, "Expired Window Time for address", res);
                    return;
                }
                // verify whether it exists in the memroy pool , otherwise throws error msg.
                let memPoolData= this.mempool.get(req.body.address);
                if(!memPoolData){
                    this.sendErrorMessage(INVALID_STATUS_CODE, "Invlaid address wallet in memory pool", res);
                    return;
                }
                // verify the signature
                let isSigValid = this.verifySignature(req.body);
                let validationWindows = this.calculateValidationWindow(req);
                let validRequest = this.createValidRequest(true, memPoolData, validationWindows, isSigValid);
                // save it if it is sig valid.
                if(isSigValid){
                    this.mempoolValid.set(req.body.address, validRequest);
                }
                res.json(validRequest);
            }else{
                this.sendErrorMessage(INVALID_STATUS_CODE, "Invalid address", res);
                return;
            }
        });
    }
    /**
     * create a new validRequest object with valid signature. 
     * @param {*} isRegisterStart 
     * @param {*} poolData 
     * @param {*} validationWindows 
     */
    createValidRequest(isRegisterStart, poolData, validationWindows, isValid){
        let validRequestObject = {};
        validRequestObject.registerStar = isRegisterStart;
        validRequestObject.status = {};
        validRequestObject.status.address = poolData.walletAddress;
        validRequestObject.status.requestTimeStamp = poolData.requestTimeStamp;
        validRequestObject.status.message = poolData.message;
        validRequestObject.status.validationWindow = validationWindows;
        validRequestObject.status.messageSignature = isValid;
        return validRequestObject;
    }
    /**
     * verify the signature based on the given address and signature
     * @param {*} reqPayload 
     * @return true if the given signature is valid, otherwise false
     */
    verifySignature(reqPayload){
        if(reqPayload.address && reqPayload.signature){
            let memPoolData= this.mempool.get(reqPayload.address);
            let response = BitcoinMessage.verify(memPoolData.message, reqPayload.address, reqPayload.signature);
            return response;
        }
        return false;
    }
    /**
     * verify the address for window time
     * 
     * @param {*} reqPayload 
     * @return true if it is in window time scope, otherwise false
     */
    verifyWidnowTime(reqPayload){
        if(reqPayload.address){
            if(this.timeRequests.get(reqPayload.address) !== 'nudefined'){
                return true;
            }
        }
        return false;
    }
    /**
     * sending error message based on the given status and error message.
     * @param {} status 
     * @param {*} errorMsg 
     * @param {*} res 
     */
    sendErrorMessage(status, errorMsg, res){
        res.status(status);
        res.json({error: errorMsg});
    }
    /**
     * Implment a format of request object.
     * @param {} req 
     * @param {*} validationWindow 
     */
    getRequestObject(req, validationWindow){
        let requestObject = { walletAddress : "", requestTimeStamp : "", message : "", validationWindow : ""};
        requestObject.walletAddress = req.body.address;
        requestObject.requestTimeStamp = req.requestTimeStamp;
        requestObject.message = this.getMessageFormat(requestObject.walletAddress, req.requestTimeStamp, MEG_POST_FIX);
        requestObject.validationWindow = validationWindow;
        return requestObject;
    }
    /**
     * generate a format of message 
     * @param {} walletAddress 
     * @param {*} requestTimestamp 
     * @param {*} postFixMsg 
     */
    getMessageFormat(walletAddress, requestTimestamp, postFixMsg){
        return walletAddress+':'+requestTimestamp+':'+postFixMsg;
    }
    /**
     * Implement a Request Validation for add
     */
    addRequestValidation(walletAddress){

        var self = this;
        let requestTimeout = setTimeout( function(){
            self.removeValidationRequest(walletAddress); 
        }, this.timeoutRequestsWindowTime);

        this.timeRequests.set(walletAddress, requestTimeout);
    }

    /**
     * Implement to calculate validation window based on timeout request window time.
     */
    calculateValidationWindow(request){
        let preResponse = this.mempool.get(request.body.address);
        let timeElapse = 0;
        if(preResponse){
            timeElapse = request.requestTimeStamp - preResponse.requestTimeStamp;
        }else{
            timeElapse = (new Date().getTime().toString().slice(0,-3)) - request.requestTimeStamp;
        }      
        let timeLeft = (this.timeoutRequestsWindowTime/1000) - timeElapse;
        return timeLeft;
    }
    /**
     * Implement Removing Request Validation and mempool
     * @param {*} walletAddress 
     */
    removeValidationRequest(walletAddress){
        this.timeRequests.delete(walletAddress);
        this.mempool.delete(walletAddress);
        this.mempoolValid.delete(walletAddress);
    }

    /**
     * Implement a POST Endpoint to add a new Block, url: "/api/block"
     */
    postNewBlock() {
        this.app.post("/block", (req, res) => {
            if(req.body.address && req.body.star){
                if(!this.mempoolValid.get(req.body.address)){
                    this.sendErrorMessage(INVALID_STATUS_CODE, "Invlaid address & signature wallet in memory pool", res);
                    return;
                }
                let blockBody = req.body;
                if(!blockBody.star.story || !blockBody.star.dec || !blockBody.star.ra){
                    this.sendErrorMessage(INVALID_STATUS_CODE, "Invlaid request payload for star properties", res);
                    return;
                }
                blockBody.star.story = Buffer(blockBody.star.story).toString('hex');

                let block = new BlockClass.Block(blockBody);
                this.blockChainServie.addBlock(block).then(_block => {
                    // remove address from mempool valid
                    this.removeValidationRequest(req.body.address);
                    res.json(block);
                }).catch(err=>{
                    this.sendErrorMessage(500, "Invlaid adding into blockchain address:"+err, res);
                });
            }else{
                this.sendErrorMessage(INVALID_STATUS_CODE, "Invalid address", res);
            }
        });
    }

    /**
     * Implement star block by Hash
     */
    getStarsHash(){
        this.app.get('/stars/hash::hashdata', (req, res) => {
            if(!req.params.hashdata){
                this.sendErrorMessage(INVALID_STATUS_CODE, "Invalid Hash address", res);
                return;
            }
            this.blockChainServie.getBlockByHash(req.params.hashdata).then(block => {
                let blockdata = JSON.parse(block);
                blockdata.body.star.storyDecoded = hex2ascii(blockdata.body.star.story);
                res.json(blockdata);
            }).catch( err => {
                this.sendErrorMessage(500, "Invlaid block by the given hash :"+err, res);
                return;
            });
        });
    }

    /**
     * Implement starts by address
     */
    getStartsWalletAddress(){
        this.app.get('/stars/address::addressdata', (req, res) => {
            if(!req.params.addressdata){
                this.sendErrorMessage(INVALID_STATUS_CODE, "Invalid wallet address", res);
                return;
            }
            this.blockChainServie.getBlockByWalletAddress(req.params.addressdata).then(blocks => {
                blocks.forEach( blockdata => {
                    blockdata.body.star.storyDecoded = hex2ascii(blockdata.body.star.story);
                });
                res.json(blocks);
            }).catch( err => {
                this.sendErrorMessage(500, "Invlaid block by the given wallet address :"+err, res);
                return;
            });
        });
    }

    /**
     * Implement a block by height 
     */
    getStarByHeight(){
        this.app.get('/block/:height', (req, res) => {
            if(!req.params.height){
                this.sendErrorMessage(INVALID_STATUS_CODE, "Invalid height ", res);
                return;
            }
            this.blockChainServie.getBlockByheight(req.params.height).then(block => {
                block.body.star.storyDecoded = hex2ascii(block.body.star.story);
                res.json(block);
            }).catch( err => {
                this.sendErrorMessage(500, "Invlaid block by the given height :"+err, res);
                return;
            });
        });
    }
    /**
     * Help method to inizialized Mock dataset, adds 10 test blocks to the blocks array
     */
    initializeMockData() {
        if(this.blocks.length === 0){
            for (let index = 0; index < 10; index++) {
                let blockAux = new BlockClass.Block(`Test Data #${index}`);
                blockAux.height = index;
                blockAux.hash = SHA256(JSON.stringify(blockAux)).toString();
                this.blocks.push(blockAux);
            }
        }
    }

}

/**
 * Exporting the BlockController class
 * @param {*} app 
 */
module.exports = (app) => { return new BlockController(app);}
