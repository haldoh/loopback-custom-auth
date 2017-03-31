'use strict';

var uuid = require('uuid/v4');

module.exports = function(Customtoken) {

	Customtoken.createAccessTokenId = function (callback) {
		console.log('Using token creation of custom token');
		callback(null, uuid());
	};

	Customtoken.observe('before save', function(ctx, next) {
		console.log('Before save hook of custom token');
		Customtoken.createAccessTokenId(function(err, id) {
			if (err) return next(err);
			ctx.instance.id = id;
			next();
		});
	});
};
