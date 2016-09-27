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
  var ResponsiveModule = angular.module('mfw.responsive', [
    'matchMedia'
  ]);

  /**
   * RUN section.
   *
   * Initialize service.
   */
  ResponsiveModule.run(['$mfwResponsive', function ($mfwResponsive) {
    $mfwResponsive.init();
  }]);


  var PREFIX = 'device-';

  /*
   * Currently rendered layout (rule or extension)
   */
  var currentMatch;

  /**
   * RESPONSIVE PROVIDER
   */
  ResponsiveModule.provider('$mfwResponsive', ResponsiveProvider);
  function ResponsiveProvider() {
    var defaultRules = {
      retina: 'only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)',
      phone: '(max-width: 767px)',
      tablet: '(min-width: 768px) and (max-width: 1024px)',
      desktop: '(min-width: 1025px)',
      portrait: '(orientation: portrait)',
      landscape: '(orientation: landscape)'
    };
    var defaultOptions = {
      reloadOnResize: true
    };
    var defaultExtensions = {};

    this.config = function (opt) {
      angular.extend(defaultOptions, opt || {});
    };
    this.addRules = function (rules) {
      angular.extend(defaultRules, rules);
    };
    this.addExtensions = function (extensions) {
      angular.extend(defaultExtensions, extensions);
    };

    this.$get = ['screenSize', '$log', '$rootScope', '$state', '$timeout', function (screenSize, $log, $rootScope, $state, $timeout) {
      var service = {
        init: init,
        screenSize: screenSize,
        is: is,
        matchingRules: allMatchingRules
      };

      return service;

      //////////////////////

      function init() {
        screenSize.rules = defaultRules;

        // Add helper methods for all extensions
        angular.forEach(Object.keys(defaultExtensions), function (key) {
          var rules = normalizeRules(defaultExtensions[key]);
          $log.debug('Handling extension', key, 'with rules', rules);
          service[extensionMethodName(key)] = newExtension(rules, key);
        });

        // Resize listener
        configureResizeListener();
      }

      /**
       * Configure events to reload state when screen is resized and a new layout should be applied.
       */
      function configureResizeListener() {
        window.addEventListener('resize', function () {
          $log.debug('Resizing. Current matching rules', allMatchingRules(), '. Current layout', currentMatch);
          if (defaultOptions.reloadOnResize) {
            checkNeedsReloadAfterResize();
          }
        });

        //////////////////////////

        function checkNeedsReloadAfterResize() {
          var currentState = $state.current;
          if (!currentState) return;

          var responsiveRules = responsiveStateConfiguration(currentState);
          if (responsiveRules && !service.is(currentMatch)) {
            var matches = service.matchingRules();
            $log.log('Current match', currentMatch, 'is no longer valid. Looking for a new match in', matches);
            angular.forEach(responsiveRules, function (rule) {
              if (service.is(rule)) {
                $log.log('Perform reload because of a new match', rule, 'while current match is', currentMatch);
                doReload();
              }
            });
          }
        }

        function doReload() {
          $log.log('doReload to state', $state.current.name);
          $state.reload($state.current);
        }
      }

      function is(key) {
        // Workaround as screenSize service only checks first match.
        if (angular.isString(key) && _.intersection(this.matchingRules(), splitRuleParts(key)).length) {
          return true;
        }

        if (key in defaultExtensions) {
          return this[extensionMethodName(key)]();
        } else if (key in this.screenSize.rules) {
          return this.screenSize.is(key);
        } else if (angular.isArray(key)) {
          return newExtension(key)();
        }
        return false;
      }

      function allMatchingRules() {
        var matching = [];
        angular.forEach(screenSize.rules, function (value, rule) {
          var matches = window.matchMedia(value).matches;
          //$log.debug('Rule: ', rule, value, '->', matches);
          if (matches) {
            matching.push(rule);
          }
        });
        return matching;
      }

      function newExtension(rules, key) {
        // If all rules in array are rules in screenSize, build a single '** and **' rule
        var screenSizeRuleBased = buildWithMediaQueryRules(rules);
        if (screenSizeRuleBased) {
          //var andRule = buildAndRule(rules);
          if (key) {
            // Add to screenSize to be used later on
            $log.debug('Add rule ', screenSizeRuleBased, 'with key', key, 'to screenSize service');
            service.screenSize.rules[key] = screenSizeRuleBased;
          }
          return function () {
            service.screenSize.is(screenSizeRuleBased);
          };
        } else {
          $log.debug('Build a complex rule');
          // Build a complex rule
          return function () {
            var result = true;
            angular.forEach(rules, function (rule) {
              if (angular.isString(rule)) {
                result &= screenSize.is(rule);
              } else if (angular.isFunction(rule)) {
                result &= rule(service);
              }
            });
            return result ? true : false;
          };
        }
      }

      function extensionMethodName(extension) {
        return 'is' + toPascalCase(extension);
      }

      function normalizeRules(rules) {
        return angular.isArray(rules) ? rules : [rules];
      }

      function buildWithMediaQueryRules(rules) {
        var tmp = rules.map(function (rule) {
          var parts = splitRuleParts(rule);
          return parts.map(screenSizeRule).join(',');
        }).join(' and ');

        if (tmp.indexOf('undefined') !== -1) {
          return undefined;
        }

        return tmp;
      }

      function splitRuleParts(rule) {
        return rule.split(/\s*,\s*/g);
      }

      function screenSizeRule(rule) {
        return service.screenSize.rules[rule];
      }

      function responsiveStateConfiguration(state) {
        return (state.data || {}).responsive;
      }
    }];
  }


  /**
   * DIRECTIVES
   */
  /**
   * @ngdoc directive
   * @name mfw.responsive.directive:mfwResponsiveMatch
   * @restrict 'A'
   * @element ANY
   * @scope
   *
   * @description
   * Directive that adds responsive CSS classes to be node element it's bound.
   *
   * All matched rules will be bound as CSS prefixed with `device-` or the given prefix.
   * Example:
   *
   * * `device-retina`
   * * `device-phone`
   * * `device-portrait`
   *
   * @param {String=} mfwResponsiveMatch CSS class prefix to be used, defaults to `device-`.
   *
   * @example
   * ```
   * <html>
   *   <head><!-- ... --></head>
   *   <body mfw-responsive-match>
   *     <!-- ... -->
   *   </body>
   * </html>
   * ```
   *
   * @example
   * ```
   * <html>
   *   <head><!-- ... --></head>
   *   <body mfw-responsive-match="">
   *     <!-- ... -->
   *   </body>
   * </html>
   * ```
   */
  ResponsiveModule.directive('mfwResponsiveMatch', screenSizesDirective);
  screenSizesDirective.$inject = [];
  function screenSizesDirective() {
    return {
      restrict: 'A',
      require: 'mfwResponsiveMatch',
      link: function (scope, elem, attr, cmScreenSizes) {
        var prefix = attr['mfwResponsiveMatch'] || PREFIX;
        cmScreenSizes.bindTo(angular.element(elem), prefix);
      },
      controller: ['$mfwResponsive', function ($mfwResponsive) {
        this.bindTo = bindTo;

        //////////////////

        function bindTo(elem, classPrefix) {
          angular.forEach(Object.keys($mfwResponsive.screenSize.rules), function (rule) {
            $mfwResponsive.screenSize.on(rule, function (current) {
              current ?
                elem.addClass(classPrefix + rule) :
                elem.removeClass(classPrefix + rule);
            });
          });
        }
      }]
    };
  }

  ResponsiveModule.directive('mfwResponsiveWhen', whenDirective);
  whenDirective.$inject = ['$compile', '$mfwResponsive'];
  function whenDirective($compile, $mfwResponsive) {
    return {
      restrict: 'A',
      terminal: true,
      priority: 1001,
      compile: function (tElem) {
        tElem.removeAttr('responsive-show-when');
        var fnName = randomCheckFunctionName();
        tElem.attr('ng-if', fnName + '()');
        var fn = $compile(tElem, null, 1500);
        return function postLink(scope, elem, attrs) {
          var screenSizes = attrs['mfwResponsiveWhen'];
          scope[fnName] = function () {
            return $mfwResponsive.is(screenSizes);
          };
          fn(scope);
        }
      }
    };
  }


  /**
   * CONFIG
   */
  ResponsiveModule.config(decorateResponsiveStates);
  decorateResponsiveStates.$inject = ['$stateProvider'];
  function decorateResponsiveStates($stateProvider) {
    $stateProvider.decorator('views', function (state, parent) {
      var result = {},
        views = parent(state);

      var declaredMediaQueries = [];

      angular.forEach(views, function (viewConfig, viewName) {
        var responsiveConfig = viewConfig.responsive;
        if (responsiveConfig) {
          // Add all declared views
          declaredMediaQueries = declaredMediaQueries.concat(Object.keys(responsiveConfig));

          // Decorate with templateProvider
          var newConfig = angular.copy(viewConfig);
          newConfig.templateProvider = ['$templateCache', '$templateFactory', '$mfwResponsive', '$log', function ($templateCache, $templateFactory, $mfwResponsive, $log) {
            var templateUrl = null;
            var filteredLayout = Object.keys(responsiveConfig).filter($mfwResponsive.is, $mfwResponsive);
            if (filteredLayout.length) {
              if (filteredLayout.length > 1) {
                $log.warn('More than one rule (', filteredLayout, ') apply for current screen size:', $mfwResponsive.matchingRules());
              }
              var resolvedLayout = filteredLayout[0];
              currentMatch = resolvedLayout;
              templateUrl = responsiveConfig[resolvedLayout];
              $log.log('Resolved layout', resolvedLayout, 'with templateUrl', templateUrl);
            }
            if (!templateUrl) {
              $log.error('No templateUrl found for responsiveConfig', responsiveConfig, 'current layout is', $mfwResponsive.matchingRules());
            }
            return $templateFactory.fromUrl(templateUrl);
          }];
          result[viewName] = newConfig;
        } else {
          result[viewName] = viewConfig;
        }
      });

      state.data = angular.extend(state.data || {}, {
        responsive: declaredMediaQueries
      });

      return result;
    });
  }


  /////////////////////////////

  function randomCheckFunctionName(preffix) {
    var suffix = Math.ceil(Math.random() * 1000) + 1;
    return preffix + suffix;
  }


  function toPascalCase(str) {
    var camelCase = str.replace(/([\:\-\_]+(.))/g, function (_, separator, letter, offset) {
      return offset ? letter.toUpperCase() : letter;
    });
    return camelCase.charAt(0).toUpperCase() + camelCase.substr(1);
  }
})();
