var MAX_PAGES = 10;
var REFRESH_INTERVAL_MS = 60 * 60 * 1000; // Reload everything every hour
var GET_NEXT_PAGE_DELAY_MS = 40 * 1000; // 40 seconds delay seems ok. Total time is around 6.5 minutes https://news.ycombinator.com/item?id=1702399
var PORT = 32412;

var hackernews = require('./news-ycombinator');
var express = require('express');
var cache = require('memory-cache');
var winston = require('winston');

winston.add(winston.transports.File, { filename: 'log.txt' });
winston.remove(winston.transports.Console);
winston.info('----------------------------------------------------------');
winston.info('----------------------------------------------------------');
winston.info('Starting execution in port: ' + PORT + ' - Refresh interval: ' + REFRESH_INTERVAL_MS + ' - Max pages: ' + MAX_PAGES);

function getNews(callback) {
  function getNewsRecursive(path, currentIteration, limit, callback) {
    winston.info('Executing request - Path: ' + path);
    hackernews.getNews(path, function(error, json) {
      if (error) {
        winston.error("########### FOUND AN ERROR ########");
        winston.error("Error: " + error);
        winston.error("Json: " + json);
        winston.error("###################################");
        callback(error, json);
      	return;
      }

      var nextIteration = currentIteration + 1;
      json.currentPage = currentIteration;
      json.nextPage = nextIteration < limit ? nextIteration : -1;
      cache.put(currentIteration, json);

      if (nextIteration < limit) {
      	setTimeout(function() {
        	getNewsRecursive(json.nextPagePath, nextIteration, limit, callback);
      	}, GET_NEXT_PAGE_DELAY_MS);
      } else {
        callback(error);
      }
    });
  }

  getNewsRecursive('news', 0, MAX_PAGES, callback);
}

var refresh = function() {
  getNews(function(error) {
    winston.info('Finished loading - Error: ' + error + ' - cache size: ' + cache.size);
  });
};
refresh();
setInterval(refresh, REFRESH_INTERVAL_MS);


var app = express();
app.set('json spaces', 0);

app.get('/news/:pageNumber', function(request, response) {
  winston.info(new Date() + ' - Request: ' + request.url + ' - UserAgent: ' + request.headers['user-agent']);

  var item = cache.get(request.params.pageNumber);
  if (item === null) {
    winston.error('------> Error');
    response.statusCode = 404;
    return response.send('Error 404: Invalid page number');
  }

  response.json(item);
});

app.listen(PORT);
