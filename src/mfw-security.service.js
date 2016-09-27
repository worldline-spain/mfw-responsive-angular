(function () {
  'use strict';

  /**
   * @ngdoc overview
   * @module mfw.security
   * @name mfw.security
   *
   * @description
   * # Description
   *
   * Security module from **Mobile FrameWork (MFW)**.
   *
   * No restrictions in HTTP middleware or local storage. Provided implementation integrated
   * with Restangular (HTTP) and cookies (storage).
   *
   * Control screens (routes) and page fragments (HTML nodes).
   *
   * ## Services
   *
   * * Check everywhere for current user information and credentials.
   *
   * ## Directives
   *
   * * Use directives to show or hide HTML content when a user is logged in or not.
   * * Use directives to show or hide HTML content based on current user credentials.
   */
  var SecurityModule = angular.module('mfw.security', []);


  /**
   * RUN section
   */
  SecurityModule.run(['$mfwSecurity', function ($mfwSecurity) {
    $mfwSecurity.init();
  }]);


  /**
   * @description User object definition
   * @typedef {Object} UserInfo
   * @property id {String} User identifier
   * @property accessToken {String} Current session token
   * @property refreshToken {String} Username
   * @property permissions {Array.<String>} User granted roles
   */

  /**
   * @typedef {Error} NotLoggedUserError
   * @description
   * Required logged user, but none available.
   */

  /**
   * @callback CurrentUserGetter
   * @returns {Promise.<UserInfo>} Promise that resolves to logged user, or rejects if not logged in or an error occured.
   */

  /**
   * @ngdoc object
   * @name mfw.security.constant:$mfwSecurityConfig
   * @description
   * Configuration object for {@link mfw.security.service:$mfwSecurity `$mfwSecurity`} service.
   */
  SecurityModule.constant('$mfwSecurityConfig', {
    /**
     * @ngdoc property
     * @name mfw.security.constant:$mfwSecurityConfig#heartbeatInterval
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @description
     * Default value: 1000
     * @returns {Number} Heartbeat interval in millis
     */
    heartbeatInterval: 1000, // Millis,
    /**
     * @ngdoc property
     * @name mfw.security.constant:$mfwSecurityConfig#currentUserGetter
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @returns {CurrentUserGetter} Getter for current user
     */
    currentUserGetter: undefined,
    /**
     * @ngdoc property
     * @name mfw.security.constant:$mfwSecurityConfig#storage
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @description
     * Default value: `$mfwSecurityStorageCookie`
     * @returns {String} Service name for storage.
     */
    storage: '$mfwSecurityStorageCookie',
    /**
     * @ngdoc property
     * @name mfw.security.constant:$mfwSecurityConfig#userInfoParser
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @description
     * Default value: `$mfwSecurityParserJWT`
     * @returns {String} Service name for user information parsing.
     */
    userInfoParser: '$mfwSecurityParserJWT',
    /**
     * @ngdoc constant
     * @name mfw.security.constant:$mfwSecurityConfig#EVENT_LOGIN
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @description
     * Default value: `$mfwSecurityLogin`
     * @returns {String} Constant for login broadcast event.
     */
    EVENT_LOGIN: '$mfwSecurityLogin',
    /**
     * @ngdoc constant
     * @name mfw.security.constant:$mfwSecurityConfig#EVENT_LOGOUT
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @description
     * Default value: `$mfwSecurityLogout`
     * @returns {String} Constant for logout broadcast event.
     */
    EVENT_LOGOUT: '$mfwSecurityLogout',
    /**
     * @ngdoc constant
     * @name mfw.security.constant:$mfwSecurityConfig#EVENT_UPDATE_CREDENTIALS
     * @propertyOf mfw.security.constant:$mfwSecurityConfig
     * @description
     * Default value: `$mfwSecurityUpdateCredentials`
     * @returns {String} Constant for credentials update broadcast event.
     */
    EVENT_UPDATE_CREDENTIALS: '$mfwSecurityUpdateCredentials'
  });

  /**
   * @ngdoc service
   * @name mfw.security.$mfwSecurityProvider
   *
   * @description
   * Provider for {@link mfw.security.service:$mfwSecurity `$mfwSecurity`}
   */
  SecurityModule.provider('$mfwSecurity', SecurityProvider);
  SecurityProvider.$inject = [];
  function SecurityProvider() {
    /**
     * @type {UserInfo}
     * @description
     * Current logged user, if any.
     */
    var currentUser;

    this.$get = ['$q', '$log', '$timeout', '$rootScope', '$mfwSecurityConfig', '$injector', function ($q, $log, $timeout, $rootScope, $mfwSecurityConfig, $injector) {
      /*jshint validthis:true */
      var storage = $injector.get($mfwSecurityConfig.storage || '$mfwSecurityStorageDummy'),
        parser = $injector.get($mfwSecurityConfig.userInfoParser || '$mfwSecurityParserIdentity');

      /**
       * @ngdoc service
       * @name mfw.security.service:$mfwSecurity
       *
       * @description
       * Authorization service.
       */
      var $mfwSecurity = {
        init: _init,
        activate: _activate,
        logged: _logged,
        logout: _logout,
        isLogged: _isLogged,
        me: _getCurrentUser,
        setPermissions: _setPermissions,
        refreshAccessToken: _refreshAccessToken,
        hasAnyPermission: _hasAny,
        hasAllPermissions: _hasAll
      };
      return $mfwSecurity;

      //////////////////////

      /**
       * @ngdoc method
       * @name mfw.security.service:$mfwSecurity#init
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @description
       * Initializer method, to be called when module is loaded.
       *
       * It checks for stored user credentials in order to activate a previous session.
       */
      function _init() {
        var storedInfo = storage.get();
        if (angular.isDefined(storedInfo)) {
          $log.log('Loading stored user information:', storedInfo);
          var userInfo = parser.fromStorage(storedInfo);
          this.activate(userInfo);
        }
      }

      /**
       * @ngdoc method
       * @name mfw.security.service:$mfwSecurity#activate
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @description
       * Method that checks whether stored credentials from a previous session are still valid or not.
       *
       * If valid will login with those credentials (and trigger {@link mfw.security.service:$mfwSecurity#events_$mfwSecurityLogin `$mfwSecurityLogin`} event),
       * otherwise will clear stored cache and load a logout session (and trigger
       * {@link mfw.security.service:$mfwSecurity#events_$mfwSecurityLogin `$mfwSecurityLogout`} event).
       *
       * It checks for stored user credentials in order to activate a previous session.
       *
       * @param {UserInfo} userInfo Full user info or stored user credentials.
       */
      function _activate(userInfo) {
        // Do not validate
        validCredentials(true);

        function validCredentials(result) {
          $log.log('Stored credentials are still valid.');
          if (result === true) {
            currentUser = userInfo;
            _notifyLogin(currentUser);
          } else {
            invalidCredentials();
          }
        }

        function invalidCredentials() {
          $log.log('Stored credentials are now invalid. Removing them.');
          storage.clear();
          _notifyLogout();
        }
      }

      /**
       * @ngdoc method
       * @name mfw.security.service:$mfwSecurity#logged
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @description
       * Method that configures a new session with new valid credentials.
       *
       * This method triggers {@link mfw.security.service:$mfwSecurity#events_$mfwSecurityLogin `$mfwSecurityLogin`} event.
       *
       * @param {Object} user Logged user. Will be parsed using a user parser. See {@link mfw.security.constant:$mfwSecurityConfig#userInfoParser `$mfwSecurityConfig.userInfoParser`}.
       */
      function _logged(user) {
        //if (angular.isDefined(currentUser)) {
        //  throw new Error('Already logged user.');
        //}
        var userInfo = parser.parse(user);
        storage.set(userInfo);
        this.activate(userInfo);
      }

      /**
       * @ngdoc method
       * @name mfw.security.service:$mfwSecurity#logout
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @description
       * Method that clears current session.
       *
       * This method triggers {@link mfw.security.service:$mfwSecurity#events_$mfwSecurityLogin `$mfwSecurityLogout`} event.
       */
      function _logout() {
        if (angular.isUndefined(currentUser)) {
          $log.warn('Log out when there\'s not an active user.');
        }
        currentUser = undefined;
        storage.clear();
        _notifyLogout();
      }

      /**
       * @ngdoc function
       * @name mfw.security.service:$mfwSecurity#me
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @returns {UserInfo} Current logged user
       */
      function _getCurrentUser() {
        return currentUser;
      }

      /**
       * @ngdoc function
       * @name mfw.security.service:$mfwSecurity#isLogged
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @returns {boolean} Whether user is currently logged or not
       */
      function _isLogged() {
        return angular.isDefined(_getCurrentUser());
      }

      /**
       *
       * @param {String} action: 'add', 'set', 'remove'
       * @param {String|String[]} permissions
       * @throws {NotLoggedUserError} If no logged user
       * @private
       */
      function _setPermissions(action, permissions) {
        if (angular.isUndefined(currentUser)) {
          throw new Error('Not logged user.');
        }

        // Normalize: convert to array
        permissions = permissions || [];
        if (!angular.isArray(permissions)) {
          permissions = [permissions];
        }

        // Update
        if (action === 'add') {
          currentUser.permissions = _.union(currentUser.permissions || [], permissions);
        } else if (action === 'remove') {
          currentUser.permissions = _.difference(currentUser.permissions || [], permissions);
        } else if (action === 'set') {
          currentUser.permissions = permissions;
        }
      }

      /**
       *
       * @returns {String[]}
       * @throws {NotLoggedUserError} If no logged user
       * @private
       */
      function _permissions() {
        if (angular.isUndefined(currentUser)) {
          throw new Error('Not logged user.');
        }
        return currentUser ? currentUser.permissions : [];
      }

      /**
       * @ngdoc function
       * @name mfw.security.service:$mfwSecurity#hasAnyPermission
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @param {String|String[]} permissions Permissions to check
       * @returns {boolean} Whether user has at least one of the specified permissions.
       */
      function _hasAny(permissions) {
        $log.debug('Checkin ANY permission from', permissions);
        var normalized = _normalizePermission(permissions);
        var userPermissions = _permissions();
        var has = normalized.filter(_userHasPermission);
        return userPermissions.length && has.length > 0;
      }

      /**
       * @ngdoc function
       * @name mfw.security.service:$mfwSecurity#refreshAccessToken
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @param {String} accessToken New access token
       */
      function _refreshAccessToken(accessToken) {
        $log.debug('refreshAccessToken');

        if (angular.isUndefined(currentUser)) {
          throw new Error('Not logged user.');
        }

        var userInfo = currentUser;
        userInfo.accessToken = accessToken;
        storage.set(userInfo);
        _notifyUpdateCredentials();
      }

      /**
       * @ngdoc function
       * @name mfw.security.service:$mfwSecurity#hasAllPermissions
       * @methodOf mfw.security.service:$mfwSecurity
       *
       * @param {String|String[]} permissions Permissions to check
       * @returns {boolean} Whether user has all the specified permissions.
       */
      function _hasAll(permissions) {
        $log.debug('Checkin ALL permission from', permissions);
        var normalized = _normalizePermission(permissions);
        var userPermissions = _permissions();
        var has = normalized.filter(_userHasPermission);
        return userPermissions.length && has.length === normalized.length;
      }

      /**
       * Method that normalizes a parametrized set of permissions, returning always an array of permission strings.
       * @param permissions {String|String[]}
       * @returns {String[]}
       * @private
       */
      function _normalizePermission(permissions) {
        if (angular.isArray(permissions)) {
          // Do nothing
        } else if (angular.isString(permissions)) {
          permissions = permissions.split(',');
        } else if (angular.isObject(permissions)) {
          permissions = [permissions];
        }
        return permissions;
      }

      /**
       * @param {String} permission Permission
       * @returns {boolean} Whether user has permission or not
       * @private
       */
      function _userHasPermission(permission) {
        var negate = false;
        var perm = permission;
        if (permission.charAt(0) === '!') {
          negate = true;
          perm = permission.substring(1);
        }
        var has = _permissions().indexOf(perm) !== -1;
        var result = negate ? !has : has;

        if (negate) {
          $log.debug('User has not permission', perm, '?', result);
        } else {
          $log.debug('User has permission', permission, '?', result);
        }

        return result;
      }

      /**
       * @ngdoc event
       * @name mfw.security.service:$mfwSecurity#$mfwSecurityLogin
       * @eventOf mfw.security.service:$mfwSecurity
       * @eventType broadcast on $rootScope
       *
       * @description
       * Event triggered when a new user logs in or when application startes
       * using previous stored credentials.
       *
       * @param {UserInfo} userInfo User information.
       */
      function _notifyLogin(userInfo) {
        _broadcast($mfwSecurityConfig.EVENT_LOGIN, angular.copy(userInfo));
      }

      /**
       * @ngdoc event
       * @name mfw.security.service:$mfwSecurity#$mfwSecurityLogout
       * @eventOf mfw.security.service:$mfwSecurity
       * @eventType broadcast on $rootScope
       *
       * @description
       * Event triggered when user logs out.
       */
      function _notifyLogout() {
        _broadcast($mfwSecurityConfig.EVENT_LOGOUT);
      }

      /**
       * @ngdoc event
       * @name mfw.security.service:$mfwSecurity#$mfwSecurityLogout
       * @eventOf mfw.security.service:$mfwSecurity
       * @eventType broadcast on $rootScope
       *
       * @description
       * Event triggered when user logs out.
       */
      function _notifyUpdateCredentials() {
        _broadcast($mfwSecurityConfig.EVENT_UPDATE_CREDENTIALS, currentUser);
      }

      /**
       * @description
       * Broadcasts a new event on `$rootScope`.
       *
       * @param {String} event Event name
       * @param {*=} data Event additional data, if any
       * @private
       */
      function _broadcast(event, data) {
        $rootScope.$broadcast(event, data);
      }
    }];
  }

  /**
   * @ngdoc object
   * @name mfw.security.service:$mfwSecurityStorageDummy
   * @description
   * Dummy storage for apps requesting NO storage. E.g.: secured cookies noy accessibles via JS.
   */
  SecurityModule.factory('$mfwSecurityStorageDummy', function () {
    return {
      'get': angular.noop,
      'set': angular.noop,
      'clear': angular.noop
    };
  });
})();
