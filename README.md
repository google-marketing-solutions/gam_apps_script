# Ad Manager API Client Library for Apps Script

## Overview
This project provides a lightweight client-library for working with the Ad
Manager API in Apps Script environments. The library is written in TypeScript.

## To your own copy of the the library

Install dependencies with npm:

```sh
$ npm install
```

Build the library:

```sh
$ npm run build
```

Use [clasp](https://developers.google.com/apps-script/guides/clasp#installation)
from the top level of the repository to create a standalone script. Once clasp
is configured, build and deploy with:

```sh
$ npm run deploy
```

Once deployed, your script can be added to other projects as an Apps Script
library.

## Usage

Add the library to your project:

```
1lMVNCqWL6uYafMrcqiXazGtyqAefGZZw_4kKFU3ZBiRGr7SYWxgPt7ec
```

Using the library directly from the Apps Script editor after adding the library
to a project should look something like this:

```js
// Import your classes.
const {AdManagerClient, StatementBuilder} = GAMAppsScriptLibrary;

// Define an application name, network code, and API Version (use the latest).
const APP_NAME = 'APP_NAME';
const NETWORK_CODE = 12345;
const API_VERSION = 'v00000';

function getUsers() {
  // Setup the client and authenticate.
  const client = new AdManagerClient(
    /** oAuthToken */  ScriptApp.getOAuthToken(),
    /** appName */    APP_NAME,
    /** networkCode */ NETWORK_CODE,
    /** apiVersion */  API_VERSION,
  );

  // Create a service.
  const userService = client.getService('UserService');

  // Make an API call.
  const statementBuilder = new StatementBuilder();
  const userPage = userService.performOperation(
    'getUsersByStatement',
    statementBuilder.toStatement()
  );
  return userPage['results'];
}
```

The library is designed to be similar to the Python client library and usage
should be broadly similar. Take a look at those
[samples](https://github.com/googleads/googleads-python-lib/tree/main/examples/ad_manager)
for further inspiration.


## Disclaimer

This is not an officially supported Google product. The code samples shared here
are not formally supported by Google and are provided only as a reference.