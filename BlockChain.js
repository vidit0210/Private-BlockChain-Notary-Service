const SHA256 = require("crypto-js/sha256");
const Block = require("./Block");
const StarDB = "./starData";
const level = require("level");

class BlockChain {
  constructor() {
    this.db = level(StarDB);
  }
  getBlockHeightPromise() {
    let db = this.db;
    let count = 0;
    return new Promise((resolve, reject) => {
      db.createReadStream()
        .on("data", data => {
          count++;
        })
        .on("close", () => {
          console.log("Count of Blocks is " + count);
          resolve(count);
        });
    });
  }
  //Function to Decode
  static _decodeStarStory(data) {
    if (data.body.star !== undefined && data.body.star.story !== undefined) {
      data.body.star.storyDecoded = Buffer.from(
        data.body.star.story,
        "hex"
      ).toString("ascii");
    }
    return data;
  }
  getBlockPromise(blockHeight, json = true) {
    let key = blockHeight;
    let db = this.db;
    return new Promise((resolve, reject) => {
      db.get(key, (err, value) => {
        if (err) {
          console.log("Block not Found");
          reject(false);
        } else {
          let blockJson = JSON.parse(value);
          blockJson = BlockChain._decodeStarStory(blockJson);
          if (json) {
            resolve(blockJson);
          } else {
            let block = new Block();
            block.loadFromJson(blockJson);
            resolve(json);
          }
        }
      });
    });
  }
  getBlockHashPromise(hash) {
    let db = this.db;
    let _decodeStarStory = BlockChain._decodeStarStory;
    return new Promise((resolve, reject) => {
      db.createValueStream()
        .on("data", stuff => {
          let data = JSON.parse(stuff);
          if (data.hash === hash) {
            data = _decodeStarStory(data);
            resolve(data);
          }
        })
        .on("close", () => {
          reject(true);
        });
    });
  }
  getBlockByWalletPromise(address) {
    let db = this.db;
    let blocks = [];
    let _decodeStarStory = BlockChain._decodeStarStory;
    return new Promise((resolve, reject) => {
      db.createValueStream()
        .on("data", stuff => {
          let data = JSON.parse(stuff);
          if (data.body.address === address) {
            data = _decodeStarStory(data);
            blocks.push(data);
          }
        })
        .on("close", () => {
          resolve(blocks);
        });
    });
  }
  cleanPromise() {
    let keyNames = "";
    let count = 0;
    let db = this.db;
    return new Promise((resolve, reject) => {
      db.createKeyStream({ type: "del" })
        .on("data", data => {
          count++;
          keyNames += "" + data;
          db.del(data);
        })
        .on("close", () => {
          if (count) console.log("Cleaned" + count + "keys");
          if (keyNames) console.log("Key names:" + keyNames);
        });
    });
  }

  validateChainPromise() {
    let db = this.db;
    let hash = "";
    let block = null;
    return new Promise((resolve, reject) => {
      db.createValueStream()
        .on("data", data => {
          console.log(data);
          block = JSON.parse(data);
          hash = block.hash;
          block.hash = "";
          if (hash !== SHA256(JSON.stringify(block)).toString()) reject(false);
        })
        .on("close", () => {
          resolve(true);
        });
    });
  }

  async createGenesisBlock() {
    console.log("CreateGenesisBlock");
    try {
      let hasGenesis = 0;
      try {
        hasGenesis = await this.getBlockHeightPromise();
        console.log("hasGenesis" + hasGenesis);
      } catch (e) {
        console.log("Cant Check BlockChain Height");
      }
      if (!hasGenesis) {
        console.log("No genesis,Adding ");
        try {
          await this.addBlockPromise("First Block Chain -Genesis Block");
        } catch (e) {
          console.log("Cant Create Genesis Block ");
        }
      } else {
        console.log("Genesis Block Exist");
      }
    } catch (e) {
      console.log("Cant add Block");
    }
  }
  async addBlockPromise(body) {
    let newBlockObject = new Block(body);
    try {
      newBlockObject.height = await this.getBlockHeightPromise();
    } catch (e) {
      console.log(e.message);
    }
    newBlockObject.time = new Date()
      .getTime()
      .toString()
      .slice(0, -3);
    console.log("height " + newBlockObject.height);
    if (newBlockObject.height > 0) {
      try {
        let data = await this.getBlockPromise(newBlockObject.height - 1);
        newBlockObject.previousBlockHash = data.hash;
      } catch (e) {
        console.log("Get Block Promise Failed:" + e.message);
      }
    }
    newBlockObject.hash = SHA256(
      JSON.stringify(this.newBlockObject)
    ).toString();
    let key = newBlockObject.height;
    let value = JSON.stringify((resolve, reject) => {
      let db = this.db;
      return new Promise((resolve, reject) => {
        db.put(key, value, err => {
          if (err) {
            let erroText = "Block" + key + "submission Failed";
            reject(erroText);
            return console.log(errorText, err);
          }
          console.log("Block " + key + "submiited");
          resolve(newBlockObject);
        });
      });
    });
  }
}
modules.exports = BlockChain;
