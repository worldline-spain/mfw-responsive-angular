# MFW Responsive v1.0.0

This AngularJS module provides a responsive-dependent logic to applications as part of **Mobile FrameWork (MFW)**.


## Features

This library relies on [`angular-match-media`](https://github.com/jacopotarantino/angular-match-media) to calculate user-defined rules based on CSS media queries.

You can define aliases, from now on **rules**, for CSS media queries that lets you define your layouts depending on current screen layout.

Rules can be combined logically (and/or) using **extensions**. An extension is a expression in the form 'rule1 AND rule2', 'rule1 OR rule2' and combinations of these forms.



### Resolution-specific layout


Provided implementation is based on [UI Router](https://github.com/angular-ui/ui-router).

If your screens needs to be rendered in a very different way depending on screen size or resolution (tablet, smartphone, portrait, landscape, etc.) and it's not possible to implement this using plain CSS media queries, you'll need different layout HTML files.

MFW Responsive lets you do this by:

* Configuring your state `views` object with a new `responsive` object.
* Specify the `templateUrl` associated to each rule or extension.




### Show/hide HTML content based on current layout

* Use directives to show or hide HTML content while screen resolution changes.



## Installation

### Via Bower

Get module from Bower registry.

```shell
$ bower install --save mfw-responsive-angular
```


### Other

Download source files and include them into your project sources.



## Usage

Once dependency has been downloaded, configure your application module(s) to require:

* `mfw.responsive` module: `$mfwResponsive` service and directives.

```js
angular
  .module('your-module', [
      // Your other dependencies
      'mfw.responsive'
  ]);
```

Inject `$mfwResponsive` service to request for current valid rules.

Use `mfw-responsive-*` directives in your HTML templates.



> For further documentation, please read the generated `ngDocs` documentation inside `docs/` folder.


### Configure

Configure your rules and extensions in *config* phase by injecting `ionicResponsiveProvider `.

```js
angular
  .module('your-module')
  .config(configResponsive);

configResponsive.$inject = ['$ionicResponsiveProvider'];
function configResponsive($ionicResponsiveProvider) {
  $ionicResponsiveProvider.config({
    reloadOnResize: true
  });
  $ionicResponsiveProvider.addRules({
    retina: 'only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)',
    phone: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1024px)',
    desktop: '(min-width: 1025px)',
    portrait: '(orientation: portrait)',
    landscape: '(orientation: landscape)'
  });
  $ionicResponsiveProvider.addExtensions({
    // Comma-separated: OR
    large: 'desktop,tablet',
    small: 'sm,xs',

    // Array elements: AND
    'tablet-landscape': ['tablet', 'landscape'],
    'phone-portrait': ['phone', 'portrait']
  });
}
```

### Define responsive layouts for states

Set responsive layouts while defining your `ui.router` states:

```js
$stateProvider.state('app.dashboard', {
  url: '/dashboard',
  views: {
    responsive: {
      'tablet': 'app/dashboard/dashboard-tablet.html',
      'phone': 'app/dashboard/dashboard-phone.html'
    }
  }
});
```

Under the scenes MFW Responsive [*decorates*](http://angular-ui.github.io/ui-router/site/#/api/ui.router.state.$stateProvider#methods_decorate) the `views` property and it will add a `templateProvider` function that checks for current screen size and resolution and then return proper `templateUrl` value.

If you enable `reloadOnResize` (`true` by default), `$mfwResponsive` will be aware of dynamic screen resize (browser or mobile device rotation) and it will reload the current state if displayed layout is no longer valid.


> For further documentation, please read the generated `ngDocs` documentation inside `docs/` folder.




## Development

* Use Gitflow
* Update package.json version
* Tag Git with same version numbers as NPM
* Check for valid `ngDocs` output inside `docs/` folder
* Apply linting rules

> **Important**: Run `npm install` before anything. This will install NPM and Bower dependencies.

> **Important**: Run `npm run lint`.

> **Important**: Run `npm run deliver` before committing anything. This will build documentation and distribution files.


### NPM commands

* Bower: install Bower dependencies in `bower_components/` folder:

```shell
$ npm run bower
```

* Build: build distributable binaries in `dist/` folder:

```shell
$ npm run build
```

* Documentation: generate user documentation (using `ngDocs`):

```shell
$ npm run docs
```

* Linting: run *linter* (currently JSHint):

```shell
$ npm run lint
```

* Deliver: **run it before committing to Git**. It's a shortcut for `build` and `docs` scripts:

```shell
$ npm run deliver
```
