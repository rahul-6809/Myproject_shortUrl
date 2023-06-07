// Importing models for the database
const urlModel = require('../Models/urlModel');

// Importing shortid for generating short URL
const shortId = require('shortid');

// Importing valid-url for checking if URL is valid or not 
const validUrl = require('valid-url');

// Importing Redis for cache memory
const redis = require('redis');

// Importing axios for making HTTP requests to check longUrl validaton
const axios = require('axios');

// Importing util for promisify
const { promisify } = require('util');



let createUrl = async (req, res) => {
    try {
        let data = req.body;
        const host = req.headers.host;
        const protocol = req.protocol;

        // Validation for request body
        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, message: "Invalid URL. Please provide valid details." });
        }

        const { longUrl } = data;
        
        //Validation for longUrl
        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide the long URL." });
        }
        // validating the syntax of long url
        if (!validUrl.isWebUri(longUrl.trim())) {
            return res.status(400).send({ status: false, message: "Please enter a valid long URL." });
        }


        // Checking the duplicacy of the URL
        let urlCheck = await urlModel.findOne({ longUrl: data.longUrl }).select({ _id: 0, longUrl: 1, shortUrl: 1, urlCode: 1 });
        
        if (urlCheck) {
            return res.status(200).send({ status: true, data: urlCheck });
        }

        // Adding base URL
        const baseUrl = protocol + '://' + host;

        // Generating short URL code
        let urlCode = shortId.generate();

        // Appending code with base URL
        const shortUrl = baseUrl + '/' + urlCode.toLowerCase();
        data.urlCode = urlCode;
        data.shortUrl = shortUrl;

        // Creating record
        const urlData = await urlModel.create(data);
        const response = await urlModel.findOne(urlData._id).select({ _id: 0, urlCode: 1, shortUrl: 1, longUrl: 1 });

        // Responding to the client with longUrl, shortUrl, urlCode
        return res.status(201).send({ status: true, data: response });

    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};

// Redirecting the user to the actual URL
const redirectUrl = async function (req, res) {
    try {
        // Getting urlCode
        const url = req.params.urlCode;
        if (!shortId.isValid(url)) {
            return res.status(400).send({ status: false, message: "Please enter a valid URL." });
        }

            const redirectedUrl = await urlModel.findOne({ urlCode: url });

            // If resource is not available
            if (!redirectedUrl) {
                return res.status(404).send({ status: false, message: "Resource not found." });
            }

            // If resource is available
            await SET_ASYNC(url, JSON.stringify(redirectedUrl.longUrl), 'EX', 86400);
            res.redirect(redirectedUrl.longUrl);
        
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }

}
// Exporting modules to access them in other files
module.exports = { createUrl, redirectUrl };
