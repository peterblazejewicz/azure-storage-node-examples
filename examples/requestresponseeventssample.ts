﻿// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

/**
* Demonstrates how to define sendingrequest and receivedresponse event handlers.
*/
const fs = require('fs');
const azure = require('azure-storage');
const container = 'sendingrequestevent3';
// The service object which will define the event handlers
const blobService = azure.createBlobService();
// optionally set a proxy
/*const proxy = {
  protocol: 'http:',
  host: '127.0.0.1',
  port: 8888
};
blobService.setProxy(proxy);
blobService2.setProxy(proxy);
*/
// the sending request event handler
let sendingRequestHandler = (webresource) => {
  webresource.withHeader('x-ms-custom-header', 'value');
  console.log('sending request event handler called');
};

// the response received event handler
let responseReceivedHandler = (response) => {
  console.log('received response event handler called');
};

let eventHandlersSample = (service, container) => {
  console.log('Starting eventHandlersSample.');
  // set the event handlers
  service.on('sendingRequestEvent', sendingRequestHandler);
  service.on('receivedResponseEvent', responseReceivedHandler);
  // create and delete a container with these handlers
  createContainer(container)
  .then((container) => {
    console.log('Created the container ' + container);
    // Delete the container
    console.log('Ending eventHandlersSample.');
    return deleteContainer(container);
  }).then((container) => {
      console.log('Deleted the container ' + container);
    })
  .catch((error) => console.error(error));
}
// Create the container.
let createContainer = (container) => new Promise((resolve, reject) => {
  blobService.createContainer(container, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve(container);
    }
  });
});

// Delete the container.
let deleteContainer = (container) => new Promise((resolve, reject) => {
  blobService.deleteContainer(container, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve(container);
    }
  });
});
//
eventHandlersSample(blobService, container);
