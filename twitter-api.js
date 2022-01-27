const axios = require('axios')
const fs = require('fs')
const Path = require('path')
const Twitter = require('twitter')
require('dotenv').config()

const client = new Twitter({
  consumer_key: process.env.A,//process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.B,//process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.C,//process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.D,//process.env.TWITTER_ACCESS_TOKEN_SECRET
})


async function download(imgURI) {
  const savePath = Path.resolve(__dirname, 'temp', 'image.png')

  const response = await axios({
    method: 'GET',
    url: imgURI,
    responseType: 'stream'
  })

  response.data.pipe(fs.createWriteStream(savePath))

  return new Promise((resolve, reject) => {
    response.data.on('end', () => {
      resolve()
    })

    response.data.on('error', (err) => {
      reject(err)
    })
  })
}


async function sendTwitterPost(name, description, imgURI) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Trying to get the image of NFT from " + imgURI + "...")
      await download(imgURI)
      const contents = await fs.promises.readFile('./temp/image.png', {encoding: 'base64'})
      console.log("Got the image, uploading image to twitter...")
      const res = await client.post('media/upload', {
        media_data: contents,
        media_category: 'tweet_image'
      })
      console.log(res.media_id_string + " Image uploaded, sending twitter post...")
      let mediaIds = []
      mediaIds.push(res.media_id_string)
      console.log(mediaIds)
      
      await new Promise(resolve => setTimeout(() => resolve(), 2000))
      await client.post('statuses/update', { 
        status: 'New Bored Ape Punk Club is minted!\n' + name ,
        media_ids: res.media_id_string
      })
      
      resolve("Twitter post successfully sent")
    }
    catch(err){
      console.log(err)
      reject("Error while sending twitter post")
    }
  })
}

async function uploadImageToTwitter(imgURI) {
  try{
    console.log("Trying to get the image of NFT from " + imgURI + "...")
    await download(imgURI)
    const contents = await fs.promises.readFile('./temp/image.png', {encoding: 'base64'})
    console.log("Got the image, uploading image to twitter...")
    const res = await client.post('media/upload', {
      media_data: contents,
      media_category: 'tweet_image',
      additional_owners: '1479323659827400704'
    })
    return res.media_id_string
  }
  catch(err){
    console.log(err)
  }
}

module.exports = {
  sendTwitterPost,
  uploadImageToTwitter
}