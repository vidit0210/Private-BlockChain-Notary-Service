/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelSandbox = require('./LevelSandbox.js');
const Block = require('./Block.js');

class Blockchain {

    constructor() {
        this.bd = new LevelSandbox.LevelSandbox();
        this.generateGenesisBlock();
    }

    // Auxiliar method to create a Genesis Block (always with height= 0)
    // You have to options, because the method will always execute when you create your blockchain
    // you will need to set this up statically or instead you can verify if the height !== 0 then you
    // will not create the genesis block
    generateGenesisBlock(){
        let block = new Block.Block("First Block Genesis Block");
        block.time = new Date().getTime().toString().slice(0,-3);
        block.hash = SHA256(JSON.stringify(block)).toString();
        this.bd.addLevelDBData(block.height,  JSON.stringify(block).toString()).then((data)=>{
            console.log('Genesis Block Data '+ data);
        });
    }

    // Get block height, it is auxiliar method that return the height of the blockchain
    getBlockHeight() {
        let self = this;
        return new Promise(function(resolve, reject){
            self.bd.getBlocksCount().then(size =>{
                resolve(size);
            }).catch(err =>{
                reject(err);
            });
        });
    }

    // Get block by hash
    getBlockByHash(hash){
        let self = this;
        return new Promise(function(resolve, reject){
            self.bd.getBlockByHash(hash).then( block =>{
                resolve(block);
            }).catch(err =>{
                reject(err);
            });
        });
    }

    // Get Blocks by address
    getBlockByWalletAddress(address){
        let self = this;
        return new Promise(function(resolve, reject){
            self.bd.getBlockByWalletAddress(address).then( blocks =>{
                resolve(blocks);
            }).catch(err =>{
                reject(err);
            });
        });
    }

    // Get Block by height
    getBlockByheight(height){
        let self = this;
        return new Promise(function(resolve, reject){
            self.bd.getBlockByHeight(height).then( block =>{
                resolve(block);
            }).catch(err =>{
                reject(err);
            });
        });
    }

    // Add new block
    addBlock(newBlock) {
        let self = this;
        return new Promise(function(resolve, reject) {
            self.getBlockHeight().then((size)=>{
            // Block height
            newBlock.height = size;
               // UTC timestamp
            newBlock.time = new Date().getTime().toString().slice(0,-3);
            // previous block hash
            if(newBlock.height>0){
                 self.getBlock(newBlock.height-1)
                 .then((previousBlock)=>{
                    let previousHash = previousBlock.hash;
                    newBlock.previousblockhash = previousHash;

                     // Block hash with SHA256 using newBlock and converting to a string
                     newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
                    
                     // Adding block object to chain
                    self.bd.addLevelDBData(newBlock.height, JSON.stringify(newBlock).toString())
                        .then((data)=>{
                            resolve(data);
                        })
                        .catch((err)=>{
                            reject(err);
                    });
                 });
            }
            });
         });
        
    }

    // Get Block By Height
    getBlock(height) {
        let self = this;
        return new Promise(function (resolve, reject){
            self.bd.getLevelDBData(height).then(block =>{
                    resolve(block);
            }).catch(err =>{
                reject(err);
            });
        });
    }

    // Validate if Block is being tampered by Block Height
    validateBlock(height) {
        let self = this;
        return new Promise(function(resolve, reject) {
            self.getBlock(height).then(block => {
                console.log('validateblock height :'+ height);
                console.log('block :' + block);
                let hashBlock = block.hash;
                block.hash = "";
                let calcuatedHashblock = SHA256(JSON.stringify(block)).toString();
                if( hashBlock === calcuatedHashblock){
                    resolve(true);
                }else{
                    resolve(false);
                }
            }).catch((err)=>{
                reject(err);
            });//getBlock
        });//primise
    }

    // Validate Blockchain
    validateChain() {
        let self = this;
        return new Promise(function(resolve, reject){
            // Add your code here
            self.getBlockHeight().then( size => {
                let blocksArray = [];
                for(let i = 0; i < size; i++){
                    console.log('validateChain blockArray start:'+i);
                    let promise = new Promise(function (vbresolve, vbreject){
                        self.validateBlock(i).then(valid =>{
                            vbresolve(valid);
                        }).catch(err=>{
                            vbreject(err);
                        });
                    });
                    blocksArray.push(promise);
                    console.log('validateChain blockArray end :'+i);
                }//for
                Promise.all(blocksArray).then( validatedBlocks => {
                    console.log('promise.all ');
                    for(let validblock of validatedBlocks ){
                        if(!validblock){
                            reject(false);
                        }
                    }
                });//promise.all
                // all valid blocks so that return true
                console.log('promise.all true');
                resolve(true);
            }).catch(err => {
                reject(false);
            });//getBlockHeight
        });//promise
    }

    // Utility Method to Tamper a Block for Test Validation
    // This method is for testing purpose
    _modifyBlock(height, block) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
                resolve(blockModified);
            }).catch((err) => { console.log(err); reject(err)});
        });
    }
   
}

module.exports.Blockchain = Blockchain;