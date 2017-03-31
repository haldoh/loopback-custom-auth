'use strict';

module.exports = function(Customuser) {

	Customuser.login = function(credentials, include, fn) {
		console.log('Using login of custom user');
		var self = this;
		if (typeof include === 'function') {
			fn = include;
			include = undefined;
		}

		fn = fn || utils.createPromiseCallback();

		include = (include || '');
		if (Array.isArray(include)) {
			include = include.map(function(val) {
				return val.toLowerCase();
			});
		} else {
			include = include.toLowerCase();
		}

		var realmDelimiter;
		// Check if realm is required
		var realmRequired = !!(self.settings.realmRequired || self.settings.realmDelimiter);
		if (realmRequired) {
			realmDelimiter = self.settings.realmDelimiter;
		}
		var query = self.normalizeCredentials(credentials, realmRequired, realmDelimiter);

		if (realmRequired && !query.realm) {
			var err1 = new Error('{{realm}} is required');
			err1.statusCode = 400;
			err1.code = 'REALM_REQUIRED';
			fn(err1);
			return fn.promise;
		}
		if (!query.email && !query.username) {
			var err2 = new Error('{{username}} or {{email}} is required');
			err2.statusCode = 400;
			err2.code = 'USERNAME_EMAIL_REQUIRED';
			fn(err2);
			return fn.promise;
		}

		self.findOne({where: query}, function(err, user) {
			var defaultError = new Error('login failed');
			defaultError.statusCode = 401;
			defaultError.code = 'LOGIN_FAILED';

			function tokenHandler(err, token) {
				if (err) return fn(err);
				if (Array.isArray(include) ? include.indexOf('user') !== -1 : include === 'user') {
					// NOTE(bajtos) We can't set token.user here:
					//  1. token.user already exists, it's a function injected by
					//     "AccessToken belongsTo User" relation
					//  2. ModelBaseClass.toJSON() ignores own properties, thus
					//     the value won't be included in the HTTP response
					// See also loopback#161 and loopback#162
					token.__data.user = user;
				}
				fn(err, token);
			}

			if (err) {
				debug('An error is reported from User.findOne: %j', err);
				fn(defaultError);
			} else if (user) {
				if (user.createAccessToken.length === 2) {
					user.createAccessToken(credentials.ttl, tokenHandler);
				} else {
					user.createAccessToken(credentials.ttl, credentials, tokenHandler);
				}
			} else {
				debug('No matching record is found for user %s', query.email || query.username);
				fn(defaultError);
			}
		});
		return fn.promise;
	};

	Customuser.prototype.createAccessToken = function(ttl, options, cb) {
		console.log('Using createAccessToken of custom user');
		if (cb === undefined && typeof options === 'function') {
			// createAccessToken(ttl, cb)
			cb = options;
			options = undefined;
		}

		cb = cb || utils.createPromiseCallback();

		if (typeof ttl === 'object' && !options) {
			// createAccessToken(options, cb)
			options = ttl;
			ttl = options.ttl;
		}
		options = options || {};
		var userModel = this.constructor;
		ttl = Math.min(ttl || userModel.settings.ttl, userModel.settings.maxTTL);
		this.customTokens.create({
			ttl: ttl,
		}, cb);
		return cb.promise;
	};
};
