const Web3 = require('web3')
const axios = require('axios')
const nodeClient = require('node-rest-client-promise').Client()
const { getOAuthToken, sendTwitterPost } = require('./twitter-api-v2.js')
const dotenv = require('dotenv')
dotenv.config()

const baseIpfsRequestURI = 'https://ipfs.io/ipfs/'
const CONTRACT_ADDRESS = '0x8d4B648F7fAB1c72d1690b42693fb7525ce3025e'
const projectId = process.env.INFURA_KEY
const etherscanKey = process.env.ETHERSCAN_KEY
const etherscan_url = `http://api.etherscan.io/api?module=contract&action=getabi&address=${CONTRACT_ADDRESS}&apikey=${etherscanKey}`
const openSeaBaseUrl = 'https://opensea.io/assets/0x8d4b648f7fab1c72d1690b42693fb7525ce3025e/'
var oAuthToken

function getDateAndHour() {
  var today = new Date();
  var date = today.getDate() +'/'+(today.getMonth()+1) + '/' + today.getFullYear();

  var hour = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

  return {date,hour}
}

async function getContractAbi() {
  const etherscan_response = await nodeClient.getPromise(etherscan_url)
  const CONTRACT_ABI = JSON.parse(etherscan_response.data.result);
  return CONTRACT_ABI;
}

async function extractNftInfo(tokenId) {
  try {
    const baseIpfsURI = process.env.IPFS_BASE_URI
    const fullURI = baseIpfsURI + tokenId + '.json'
    const requestURI = baseIpfsRequestURI + fullURI.substring(7)
    
    console.log("Trying to get NFT metadata from " + requestURI + "...")
    const nftMetadata = await axios.get(requestURI)
    const name = nftMetadata.data.name
    const description = nftMetadata.data.description
    const imgURI = baseIpfsRequestURI + nftMetadata.data.image.substring(7)

    return { name, description, imgURI }
  }
  catch(err) {
    console.log(err)
    console.log("Error while extracting nft info")
    return err
  }
}

async function handleTransferEvent(event) {
  
  try{
    const fromAddress = event.returnValues.from
    const tokenId = event.returnValues.tokenId
    console.log("\nTransfer occurred")
    if(fromAddress == '0x0000000000000000000000000000000000000000') {
      console.log("Minted:\n", event.returnValues)
      const { name, description, imgURI } = await extractNftInfo(tokenId)
      const openSeaUrl = openSeaBaseUrl + tokenId
      const response = await sendTwitterPost(oAuthToken, name, imgURI, openSeaUrl, tokenId)
      console.log(response)
    }
  }
  catch(err) {
    console.log(err)
    console.log("Error while handling transfer event")
  }
}


async function startListening(contract) {
  console.log('\nStarted listening minting events...')

  let prevEvents = await contract.getPastEvents('Transfer', { fromBlock: 0 })

  setInterval(async () => {
    let  { date, hour } = getDateAndHour()
    console.log("\nChecking if any transfer occured... " + date + " " + hour)
    let newEvents = await contract.getPastEvents('Transfer', { fromBlock: 0 })
    
    if(newEvents.length != prevEvents.length) {
      await new Promise(resolve => setTimeout(resolve, 1000 * 15))
      let newEventCount = newEvents.length - prevEvents.length

      for(let i = newEventCount; i > 0; i--) {
        await handleTransferEvent(newEvents[newEvents.length - i])
      }
    }
    else {
      console.log("No new transfer event found")
    }
    prevEvents = newEvents
  }, 1000 * 60 * 3)
}


(async () => {
  oAuthToken = await getOAuthToken()

  var web3 = new Web3('https://mainnet.infura.io/v3/' + projectId)
  console.log("\nConnected to mainnet")

  const CONTRACT_ABI = await getContractAbi()
  console.log("\nRetrieved contract abi")

  const contract = new web3.eth.Contract(
    CONTRACT_ABI, 
    CONTRACT_ADDRESS
  )
  
  startListening(contract)

})()
