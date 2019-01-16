/* ===== Persist data with LevelDB ==================
|  Learn more: level: https://github.com/Level/level |
/===================================================*/

const level = require('level');
const chainDB = './chaindata';

class LevelSandbox {

    constructor() {
        this.db = level(chainDB);
    }

    // Get data from levelDB with key (Promise)
    getLevelDBData(key){
        let self = this;
        // Add your code here, remember un Promises you need to resolve() or reject()
        return new Promise(function(resolve, reject) {
            self.db.get(key, (err, value) =>{
                if(err){
                    if(err.type == 'NotFoundError'){
                        console.log('Block ' + key + ' not found');
                        reject(err);
                    }else{
                        console.log('Block ' + key + ' get failed', err);
                        reject(err);
                    }
                } else {
                    resolve(JSON.parse(value));
                }
            });
        });
    }

    // Add data to levelDB with key and value (Promise)
    addLevelDBData(key, value) {
        let self = this;
        return new Promise(function(resolve, reject) {
            // Add your code here, remember un Promises you need to resolve() or reject()
            self.db.put(key, value, function(err){
                if(err){
                    console.log('Block' + key + 'submission failed', err);
                    reject(err);
                }
                resolve(value);
            }); 
        });
    }

    // Method that return the height
    getBlocksCount() {
        let self = this;
        return new Promise(function(resolve, reject){
            let setCounts = new Set();
            self.db.createReadStream({ keys: true, values: false })
                .on('data', function(data){
                    setCounts.add(data);
                })
                .on('error', function(err){
                    reject(err);
                })
                .on('close', function(){
                    resolve(setCounts.size);
                });
        });
    }

    // Get Block by hash
    getBlockByHash(hash){
        let self = this;
        let block = null;
        return new Promise(function(resolve, reject){
            self.db.createReadStream()
                .on('data', function(data){
                    let _block = JSON.parse(data.value);
                    if(_block.hash === hash){
                        block = data.value;
                    }
                })
                .on('error', function(err){
                    reject(err);
                })
                .on('close', function(){
                    resolve(block);
                });
        });
    }

    // Get Blocks by Address
    getBlockByWalletAddress(address){
        let self = this;
        let blocks = [];
        return new Promise(function(resolve, reject){
            self.db.createReadStream()
                .on('data', function(data){
                    let _block = JSON.parse(data.value);
                    if(_block.body.address === address){
                        blocks.push(_block);
                    }
                })
                .on('error', function(err){
                    reject(err);
                })
                .on('close', function(){
                    resolve(blocks);
                });
        });
    }
       
    // Get block by height
    getBlockByHeight(height){
        let self = this;
        let block = null;
        return new Promise(function(resolve, reject){
            self.db.createReadStream()
                .on('data', function(data){
                    let _block = JSON.parse(data.value);
                    if(_block.height == height){
                        block = _block;
                    }
                })
                .on('error', function(err){
                    reject(err);
                })
                .on('close', function(){
                    resolve(block);
                });
        });
    }

}

module.exports.LevelSandbox = LevelSandbox;