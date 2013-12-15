var request = require('request');
var cheerio = require('cheerio');

var baseUrl = 'https://news.ycombinator.com/';

module.exports.getNews = function(path, callback) {
  var url = baseUrl + path;
  getNewsFromUrl(url, callback);
}

function getNewsFromUrl(url, callback) {
  request(url, function (error, response, body) {
    if (error) {
      callback(error, '');
      return;
    }

    $ = cheerio.load(body);

    var news = $('td.title').filter(function(index, element) {
      var isNumber = $(this).attr('align') === 'right' && $(this).attr('valign') === 'top';
      var isMore = ($(this).find('a').text() === 'More') && ($(this).find('a').attr('rel') === 'nofollow' || $(this).find('a').attr('href') === 'news2');
      return !isNumber && !isMore;
    });

    var idPattern = /id=(.*)/
    var idMatcher = new RegExp(idPattern);

    var domainPattern = /(\()(.*)(\))/
    var domainMatcher = new RegExp(domainPattern);

    var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/
    var urlMatcher = new RegExp(urlPattern);

    var json = {
      news: [],
      nextPagePath: ''
    };

    news.each(function() {
      var domainMatch = domainMatcher.exec($(this).find('span.comhead').text());
      var urlHRef = $(this).find('a').attr('href');
      var subtextClass = $(this).parent().next().find('.subtext');

      var title = $(this).find('a').text();
      var idMatch = idMatcher.exec(subtextClass.find('a').last().attr('href'));
      var id = idMatch === null ? title : idMatch[1];
      var domain = domainMatch == null ? '' : domainMatch[2];
      var link = urlMatcher.test(urlHRef) ? urlHRef : baseUrl + urlHRef;
      var score = parseInt(subtextClass.find('span').text().split(' ')[0]);
      var user = subtextClass.find('a').first().text();
      var comments = parseInt(subtextClass.find('a').last().text().split(' ')[0]);

      subtextClass.children().each(function(i, elem) {
        $(this).remove();
      });
      var timestamp = subtextClass.text().replace('by', '').replace('|', '').trim();

      var item = {
        id: id,
        domain: domain,
        title: title,
        link: link,
        score: score,
        user: user,
        timestamp: timestamp,
        comments: comments
      };

      json.news.push(item);
    });

    var nextPage = $('td.title').filter(function(index, element) {
      var isMore = ($(this).find('a').text() === 'More') && ($(this).find('a').attr('rel') === 'nofollow' || $(this).find('a').attr('href') === 'news2');
      return isMore;
    });

    var segment = nextPage.find('a').last().attr('href');
    segment = (segment.indexOf('/') == 0) ? segment.substring(1, segment.length) : segment;
    json.nextPagePath = segment;

    callback(null, json);
  });
}
