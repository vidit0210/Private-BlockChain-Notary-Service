const SHA256 = require("crypto-js/sha256");
class Block {
  constructor(_body) {
    this.hash = "";
    this.height = "";
    this._body = _body;
    this.time = 0;
    this.previousBlockHash = "";
  }

  //Function to Load  data from Json
  loadFromJson(_data) {
    this.hash = _data.hash;
    this.height = _data.height;
    this.body = _data.body;
    this.time = _data.time;
    this.previousBlockHash = _data.previousBlockHash;
  }
  isValid() {

    /**
     * Store the Current Hash in the Variable Block Hash
     * Empty the Hash And Check The Hash Again to Verify the Integrity(Equal or not)
     */

    let blockHash = this.hash;
    this.hash = "";
    let validBlockHash = SHA256(JSON.stringify(this)).toString();
    this.hash = blockHash;
    return blockHash == validBlockHash;
  }
}
module.exports = Block;
