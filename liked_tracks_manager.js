const express = require('express');
const creds = require('./credentials.json')
const Spotify = require('spotify-web-api-node');
const {ClientCredentials, ResourceOwnerPassword, AuthorizationCode} = require('simple-oauth2');
require('dotenv').config();

var CLIENT_ID = process.env.CLIENT_ID;
var CLIENT_SECRET = process.env.CLIENT_SECRET;
var REDIRECT_URI = 'http://localhost:3000/callback/';
var SCOPE = 'user-library-read';
var tracks = [];

//Create instance of api wrapper
var spotifyAPI = new Spotify();

//Create instance of express app
var app = express()

//load view engine
app.set('views', './views');
app.set('view engine', 'pug');

//Construct config object
const config = {
    client:{
        id: CLIENT_ID,
        secret: CLIENT_SECRET
    },
    auth:{
        tokenHost: 'https://accounts.spotify.com',
        tokenPath: '/api/token',
        authorizePath: '/authorize'
    }
}

//Create client instance of 'Authorization Code' grant type with config info
const client = new AuthorizationCode(config)

//"login" page
app.get('/login', function(req, res){

    //Client requests authorization code, directs response to redirect_URI
    const authorizationUri = client.authorizeURL({
        redirect_uri: REDIRECT_URI,
        scope: SCOPE
    })

    res.redirect(authorizationUri)
});

//Redirect_uri page
app.get('/callback', async function(req, res) {

    //Retrieve Authorization code
    const {code} = req.query;
    
    //Create options object (aka params) to request access token
    const options = {
        code, 
        redirect_uri: REDIRECT_URI
    };

    //Request access Token
    try {
        const result = await client.getToken(options);
        accessToken = result.token.access_token
        spotifyAPI.setAccessToken(accessToken) 
    } catch (error) {
        console.error(error.message);
        res.send('Access Token Error')
    }

    //use wrapper to retrieve user saved tracks
    
    limit = 50 //Max # of tracks allowed by Spotify for each call
    offset = 0 //Start with first track
    async function retrieveTracks() {
        try {
            
            let response = await spotifyAPI.getMySavedTracks({
                limit: limit,
                offset: offset
            })
            if (response.body.items.length) {
                for (let i = 0; i < response.body.items.length; i++) {
                    track_info = {
                        name: response.body.items[i].track.name,
                        artist: response.body.items[i].track.artists[0].name,
                        album: response.body.items[i].track.album.name,
                        time: response.body.items[i].track.duration_ms
                    }
                    tracks.push(track_info)
                }
                offset += 50; //Next chunk of 50 tracks
                await retrieveTracks();
            } else {
                return(tracks)
            }
            
        } catch(error) {
            console.error(error)
        }
    }
    await retrieveTracks();

    res.render('login', {num_tracks: tracks.length});
})

app.get('/duplicates',  function(req, res) {

    //Find duplicates
    var duplicates = []; //Feels clunky, should be able to simply use return
    n = 0;
    function checkDuplicates(arr) {
        for (let i = n + 1; i < arr.length; i++) {
            if (arr[n].name == arr[i].name && arr[n].time == arr[i].time) {
                duplicates.push(arr[n]);
                //duplicates.push(arr[i]);
            }         
        }
        if (n < arr.length - 1){
            n++;
            checkDuplicates(arr);
        } else {
            //Why can't I simply access duplicates array from return? it gives me undefined
            return duplicates
        }
    }
    checkDuplicates(tracks);
    res.render('duplicates', duplicate_tracks= duplicates)
    console.log('Found ' + duplicates.length + ' duplicates');
})

app.get('/', function(req, res) {

    

    res.render('index');
})

app.listen(3000)