(function () {
  'use strict';

  /**
   * @ngdoc overview
   * @module mfw.responsive
   * @name mfw.responsive
   *
   * @requires {@link https://github.com/jacopotarantino/angular-match-media matchMedia}
   * @requires {@link https://github.com/angular-ui/ui-router ui.router}
   *
   * @description
   * # Description
   *
   * Responsive layout module from **Mobile FrameWork (MFW)**.
   *
   * This module relies on {@link https://github.com/jacopotarantino/angular-match-media `angular-match-media`} library
   * and extends its cappabilities by adding extensions (combination of rules).
   *
   *
   * # Media queries
   *
   * Take advantage of known CSS {@link https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries media queries}
   * from layout designers in code using *rules*. A rule is a media query as complex as you need.
   *
   *
   * # Services
   *
   * Using {@link mfw.responsive.service:$mfwResponsive `$mfwResponsive`} you'll be able to:
   *
   * * Check everywhere for current layout.
   * * Check if an specific rule or extension is matched now.
   * * Event-driven API for layout changes.
   *
   *
   * # Directives
   *
   * Use directives to:
   *
   * * Add CSS classes to any DOM element with all applying rules. Similar to Ionic's
   *    {@link http://ionicframework.com/docs/platform-customization/platform-classes.html platform classes}.
   * * Show or hide content depending on specific rules or extensions.
   *
   *
   * # UI Router
   *
   * Declares a {@link http://angular-ui.github.io/ui-router/site/#/api/ui.router.state.$stateProvider#methods_decorator
   * `$state` decorator} that lets you {@link mfw.responsive.service:$mfwResponsive#description_ui-router-integration
   * define different state layouts} based on current screen resolution, defined as rules (CSS media queries).
   */
  var ResponsiveModule = angular.module('mfw.responsive', [
    'ui.router',
    'matchMedia'
  ]);


  var PREFIX = 'device-';

  /*
   * Currently rendered layout (rule or extension)
   */
  var currentMatch;

  /**
   * RESPONSIVE PROVIDER
   */
  /**
   * @ngdoc service
   * @name mfw.responsive.$mfwResponsiveProvider
   *
   * @description
   * Provider for {@link mfw.responsive.service:$mfwResponsive `$mfwResponsive`}.
   */
  ResponsiveModule.provider('$mfwResponsive', ResponsiveProvider);
  function ResponsiveProvider() {
    var defaultOptions = {
      reloadOnResize: true
    };
    var defaultRules = {
      lg: '(min-width: 1200px)',
      md: '(min-width: 992px) and (max-width: 1199px)',
      sm: '(min-width: 768px) and (max-width: 991px)',
      xs: '(max-width: 767px)',
      retina: 'only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)',
      phone: '(max-width: 767px)',
      tablet: '(min-width: 768px) and (max-width: 1024px)',
      desktop: '(min-width: 1025px)',
      portrait: '(orientation: portrait)',
      landscape: '(orientation: landscape)'
    };
    var defaultExtensions = {};

    /**
     * @ngdoc function
     * @name mfw.responsive.$mfwResponsiveProvider#config
     * @methodOf mfw.responsive.$mfwResponsiveProvider
     *
     * @description
     * Configure behaviour of {@link mfw.responsive.service:$mfwResponsive `$mfwResponsive`} service.
     *
     * @param {object} options Options
     * @param {boolean=} options.reloadOnResize
     *    Whether a responsive state should be reloaded when rendered layout is no longer valid after a view resize.
     *
     *    Defaults to `true`.
     */
    this.config = function (opt) {
      angular.extend(defaultOptions, opt || {});
    };

    /**
     * @ngdoc function
     * @name mfw.responsive.$mfwResponsiveProvider#addRules
     * @methodOf mfw.responsive.$mfwResponsiveProvider
     *
     * @description
     * Add new rules, or redefine the default ones:
     *
     * * `lg`: `(min-width: 1200px)`
     * * `md`: `(min-width: 992px) and (max-width: 1199px)`
     * * `sm`: `(min-width: 768px) and (max-width: 991px)`
     * * `xs`: `(max-width: 767px)`
     * * `retina`: `only screen and (min-device-pixel-ratio: 2),
     *      only screen and (min-resolution: 192dpi),
     *      only screen and (min-resolution: 2dppx)`
     * * `phone`: `(max-width: 767px)`
     * * `tablet`: `(min-width: 768px) and (max-width: 1024px)`
     * * `desktop`: `(min-width: 1025px)`
     * * `portrait`: `(orientation: portrait)`
     * * `landscape`: `(orientation: landscape)`
     *
     * @param {Object.<string,string>} rules
     *    New set of {@link https://github.com/jacopotarantino/angular-match-media#custom-screen-sizes-or-media-queries rules}
     *    as described in peer library {@link https://github.com/jacopotarantino/angular-match-media `angular-match-media`}.
     */
    this.addRules = function (rules) {
      angular.extend(defaultRules, rules || {});
    };

    /**
     * @ngdoc function
     * @name mfw.responsive.$mfwResponsiveProvider#addExtensions
     * @methodOf mfw.responsive.$mfwResponsiveProvider
     *
     * @description
     * Add new extensions.
     *
     * An extension is a logical (and/or) combination of {@link mfw.responsive.$mfwResponsiveProvider#methods_addRules rules}
     * to perform more complex calculations.
     *
     * @param {Object} extensions New set of extensions:
     *
     * * **AND**:
     *   * rule1 AND rule2: set a `string` with a list of rules separated by a comma.
     *   * E.g.: `{ large: 'tablet,desktop' }`
     * * **OR**:
     *   * rule1 OR rule2: set a `string[]` with all rules in it.
     *   * E.g.: `{'tablet-landscape': ['tablet', 'landscape']}`
     */
    this.addExtensions = function (extensions) {
      angular.extend(defaultExtensions, extensions || {});
    };

    this.$get = ['screenSize', '$window', '$log', '$rootScope', '$state', function (screenSize, $window, $log, $rootScope, $state) {
      /*jshint validthis:true */
      /**
       * @ngdoc service
       * @name mfw.responsive.service:$mfwResponsive
       *
       * @description
       * Authorization service.
       *
       * # UI Router integration
       *
       * All states defined in {@link http://angular-ui.github.io/ui-router/site/#/api/ui.router.state.$stateProvider#methods_state ui-router's `$state`}
       * can contain a new property `responsive` inside the `views` object with the form:
       *
       * * Key (`string`): name of a rule or extension
       * * Value (`string`): path of the template to be rendered when rule or extension is applied (same as `templateUrl` property)
       *
       * <pre>
       * $stateProvider.state('app.dashboard', {
       *   url: '/dashboard',
       *   views: {
       *     responsive: {
       *       'tablet': 'app/dashboard/dashboard-tablet.html',
       *       'phone': 'app/dashboard/dashboard-phone.html'
       *     }
       *   }
       * });
       * </pre>
       *
       * ## Reload
       *
       * Service {@link mfw.responsive.$mfwResponsiveProvider#methods_config can be configured} to reload the current state if the rendered layout is no longer valid if screen
       * is resized (manually or rotating a mobile device).
       *
       * Reload is not necessary when using {@link mfw.responsive.directive:mfwResponsiveWhen `mfwResponsiveWhen`}
       * directive, it only affects to *responsive routes*.
       */
      var service = {
        /**
         * @ngdoc constant
         * @name mfw.responsive.service:$mfwResponsive#screenSize
         * @propertyOf mfw.responsive.service:$mfwResponsive
         * @returns {object} Instance of the underlying {@link https://github.com/jacopotarantino/angular-match-media#in-a-controller `screenSize`} service.
         */
        screenSize: screenSize,
        is: is,
        matchingRules: matchingRules
      };

      initialize();

      return service;

      //////////////////////

      /**
       * @description
       * Initializer method, to be called when service is instantiated.
       *
       * Configures `screenSize` service with defined rules and extensions.
       *
       * @private
       */
      function initialize() {
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
       * @description
       * Configure events to reload state when screen is resized and a new layout should be applied.
       *
       * @private
       */
      function configureResizeListener() {
        window.addEventListener('resize', function () {
          $log.debug('Resizing. Current matching rules', matchingRules(), '. Current layout', currentMatch);
          if (defaultOptions.reloadOnResize) {
            checkNeedsReloadAfterResize();
          }
        });

        //////////////////////////

        function checkNeedsReloadAfterResize() {
          var currentState = $state.current;
          if (currentState) {
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
        }

        /**
         * @description
         * Forces the {@link http://angular-ui.github.io/ui-router/site/#/api/ui.router.state.$state#methods_reload reload}
         * of the current state.
         *
         * @private
         */
        function doReload() {
          $log.log('doReload to state', $state.current.name);
          $state.reload($state.current);
        }
      }

      /**
       * @ngdoc method
       * @name mfw.responsive.service:$mfwResponsive#is
       * @methodOf mfw.responsive.service:$mfwResponsive
       *
       * @description
       * Method that checks whether the specified rule or extension is valid now based on
       * {@link mfw.responsive.service:$mfwResponsive#methods_matchingRules current matching rules}.
       *
       * @param {string} key Name of a rule or extension.
       *
       * @returns {boolean} Whether the specified rule or extension is being applied now.
       */
      function is(key) {
        // Workaround as screenSize service only checks first match.
        if (angular.isString(key) && intersection(this.matchingRules(), splitRuleParts(key)).length) {
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

      /**
       * @ngdoc method
       * @name mfw.responsive.service:$mfwResponsive#matchingRules
       * @methodOf mfw.responsive.service:$mfwResponsive
       *
       * @description
       * Method that returns a list with all matching rules.
       *
       * @returns {string[]} Current matching rules.
       */
      function matchingRules() {
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

      /**
       * @description
       * Creates a new extension and associates a dynamic function to `screenSize` service to be checked in the form
       * `screenSize.is(extensionName)`.
       *
       * @param {string} rules Combination of rules that defines the extension.
       * @param {string} key Name of the extension.
       * @returns {Function} Function that validates if the specified rule is matching now or not.
       *
       * @private
       */
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
            return service.screenSize.is(screenSizeRuleBased);
          };
        } else {
          $log.debug('Build a complex rule');
          // Build a complex rule
          return function () {
            var result = true;
            angular.forEach(rules, function (rule) {
              /*jshint bitwise: false */
              if (angular.isString(rule)) {
                result &= screenSize.is(rule);
              } else if (angular.isFunction(rule)) {
                result &= rule(service);
              }
            });
            return !!result;
          };
        }
      }

      /**
       * @description
       * Returns a boolean getter function name for the given extension name.
       *
       * E.g.: extension `tablet`, getter `isTablet`
       *
       * @param {string} extension Extension name.
       * @returns {string} Name of a getter function for the given extension name.
       * @private
       */
      function extensionMethodName(extension) {
        return 'is' + toPascalCase(extension);
      }

      /**
       * @description
       * Method that ensures that rules is an array of strings.
       *
       * If it receives an array it returns it, otherwise it creates an array with that item in it.
       *
       * @param {string|string[]} rules Rules.
       * @returns {string[]} An array of rules.
       * @private
       */
      function normalizeRules(rules) {
        return angular.isArray(rules) ? rules : [rules];
      }

      /**
       * @description
       * Method that combines all specified rules, by name, into a CSS media query performing all logical operations
       * (and/or).
       *
       * * Each item containing a comma-separated list of rule names will be resolved as an OR (`,` in media queries)
       * * All items will be joined with `and`.
       *
       * E.g.:
       * ```js
       * // tablet: (min-width: 768px) and (max-width: 1024px)
       * // desktop: (min-width: 1025px)
       * // landscape: (orientation: landscape)
       * var rules = ['tablet,desktop', 'landscape'];
       * var combination = buildMediaQueryRules(rules);
       * // (min-width: 768px) and (max-width: 1024px),(min-width: 1025px) and (orientation: landscape)
       * ```
       *
       * @param {string[]} rules Array of rule names.
       * @returns {string} CSS media query as a logical combination of given rules.
       * @private
       */
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

      /**
       * @description
       * Splits a comma-sparated list of rules into a list of rules. Ignores blanks.
       *
       * @param {string} rule Comma-separated list of rules, blanks allowed.
       * @returns {string[]} Rule names.
       * @private
       */
      function splitRuleParts(rule) {
        return rule.split(/\s*,\s*/g);
      }

      /**
       * @description
       * Returns the CSS media query that defines the rule.
       *
       * @param {string} rule Name of a rule.
       * @returns {string} CSS media query.
       * @private
       */
      function screenSizeRule(rule) {
        return service.screenSize.rules[rule];
      }

      /**
       * @description
       * Method that returns the responsive configuration defined in an ui-router state definition.
       *
       * Responsive configuration is defined with key `responsive` nested in `data` object.
       *
       * @param {object} state UI-Router state definition.
       * @returns {object} Responsive configuration.
       * @private
       */
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
   <example module="demo-match">
   <file name="index.html">
   <div mfw-responsive-match view-classes></div>
   <div mfw-responsive-match="screen-" view-classes></div>
   </file>
   <file name="app.js">
   angular.module('demo-match', ['mfw.responsive'])
     .directive('viewClasses', function () {
       return {
         restrict: 'A',
         controller: function ($scope, $element) {
           $scope.$watch(function () {
             return $element[0].className;
           }, function () {
             $element.html('Current class names: ' + prettyPrintClass($element));
           });
         }
       };

       function prettyPrintClass($elem) {
         return '<ul>'+$elem[0].className.split(' ')
           .sort()
           .map(function (className) {
               return '<li>'+className+'</li>';
           }).join('')
           +'</ul>';
       }
     });
   </file>
   </example>
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
            // Initial status
            setClassIfActive(rule, $mfwResponsive.is(rule));

            // Event handler
            $mfwResponsive.screenSize.on(rule, function () {
              setClassIfActive(rule, $mfwResponsive.is(rule));
            });
          });

          function setClassIfActive(rule, isActive) {
            if (isActive) {
              elem.addClass(classPrefix + rule);
            } else {
              elem.removeClass(classPrefix + rule);
            }
          }
        }
      }]
    };
  }

  /**
   * @ngdoc directive
   * @name mfw.responsive.directive:mfwResponsiveWhen
   * @restrict 'A'
   * @element ANY
   * @scope
   *
   * @description
   * Directive that shows/hides DOM content depending on current matching rules or extensions.
   *
   * It's implemented internally using AngularJS {@link https://docs.angularjs.org/api/ng/directive/ngIf `ngIf`} directive.
   *
   * @param {String} mfwResponsiveWhen Name of the rule or extension that lets the content appear on screen.
   *
   * @example
   <example module="demo-when">
   <file name="index.html">
   <div mfw-responsive-when="small">It's a small screen: sm or xs.</div>
   <div mfw-responsive-when="phone">It's a phone.</div>
   <div mfw-responsive-when="large">It's a large screen: desktop or tablet.</div>
   <div mfw-responsive-when="tablet">It's a tablet.</div>
   <div mfw-responsive-when="tablet-portrait">It's a tablet portrait.</div>
   <div mfw-responsive-when="tablet-landscape">It's a tablet landscape.</div>
   </file>
   <file name="app.js">
   angular.module('demo-when', ['mfw.responsive'])
     .config(function ($mfwResponsiveProvider) {
       $mfwResponsiveProvider.addExtensions({
         large: 'desktop,tablet',
         small: 'sm,xs',
         'tablet-landscape': ['tablet', 'landscape'],
         'tablet-portrait': ['tablet', 'portrait']
       });
     });
   </file>
   </example>
   */
  ResponsiveModule.directive('mfwResponsiveWhen', whenDirective);
  whenDirective.$inject = ['$compile', '$mfwResponsive'];
  function whenDirective($compile, $mfwResponsive) {
    return {
      restrict: 'A',
      terminal: true,
      priority: 1001,
      compile: function (tElem) {
        tElem.removeAttr('mfw-responsive-when');
        var fnName = randomCheckFunctionName('mfwWhen');
        tElem.attr('ng-if', fnName + '()');
        var fn = $compile(tElem, null, 1500);
        return function postLink(scope, elem, attrs) {
          var screenSizes = attrs['mfwResponsiveWhen'];
          scope[fnName] = function () {
            return $mfwResponsive.is(screenSizes);
          };
          fn(scope);
        };
      }
    };
  }


  /**
   * CONFIG
   *
   * Declares a {@link http://angular-ui.github.io/ui-router/site/#/api/ui.router.state.$stateProvider#methods_decorator
   * `$state` decorator} of the `views` property.
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

  function intersection(arr1, arr2) {
    var smaller = arr1.length > arr2.length ? arr2 : arr1;
    var inters = [];
    for (var idx = 0; idx < smaller.length; idx++) {
      var elem = smaller[idx];
      if (arr1.indexOf(elem) !== -1 && arr2.indexOf(elem) !== -1) {
        inters.push(elem);
      }
    }
    return inters;
  }
})();
