var MAX_PAGES = 10;
var REFRESH_INTERVAL = 60 * 60 * 1000;

var hackernews = require('./news-ycombinator');
var express = require('express');
var cache = require('memory-cache');


function getNews(callback) {
  var newsList = [];
  function getNewsRecursive(path, currentIteration, limit, callback) {
    hackernews.getNews(path, function(error, json) {
      if (error) {
      	console.log(error);
      	callback(error, []);
      	return;
      }

      var nextIteration = currentIteration + 1;
      json.currentPage = currentIteration;
      json.nextPage = nextIteration < limit ? nextIteration : -1;
      newsList.push(json);

      if (nextIteration < limit) {
        getNewsRecursive(json.nextPagePath, nextIteration, limit, callback);
      } else {
        callback(error, newsList);
      }
    });
  }

  getNewsRecursive('news', 0, MAX_PAGES, callback);
}

var refresh = function() {
  getNews(function(error, items) {
    cache.put('news', items);
    console.log('Finished loading - Error: ' + error + ' - array size: ' + items.length); 
  });
};
refresh();
setInterval(refresh, REFRESH_INTERVAL);


var app = express();
app.set('json spaces', 0);

app.get('/news/:pageNumber', function(request, response) {
  console.log(new Date() + ' - Request: ' + request.url + ' - UserAgent: ' + request.headers['user-agent']);

  var page = request.params.pageNumber
  if (page < 0 || cache.get('news') === null || page >= cache.get('news').length) {
  	console.log('------> Error');
    response.statusCode = 404;
    return response.send('Error 404: Invalid page number');
  }

  var item = cache.get('news')[page];
  response.json(item);
});

app.listen(32412);
