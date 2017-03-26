//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

/**
* This sample demonstrates how to handle continuation tokens and virtual "pages" of results when performing a listing
* operation on the blob service.
*
* This sample peformsthe following steps:
*
* 0. Create container.
*
* 1. Create 50 blobs.
*
* 2. List the first 10(page size) blobs.
*
* 3. Check whether there are more results.
*
* 4. Repeat 2 and 3 until complete.
*
*/

const fs = require('fs');
const azure = require('azure-storage');
const container = 'paginationsample';
const blob = 'contsample';
let blobs = [];
const blobService = azure
  .createBlobService()
  .withFilter(new azure.ExponentialRetryPolicyFilter());

// optionally set a proxy
/*var proxy = {
  protocol: 'http:',
  host: '127.0.0.1',
  port: 8888
};

blobService.setProxy(proxy);
*/

let totalBlobsCount;
let pageSize;

let continuationSample = () => {
  const processArguments = process.argv;
  if (processArguments.length !== 4) {
    console.log('Incorrect number of arguments. Should be: numBlobs pageSize [deleteContainer]\nT' +
        'ry: 51 10');
    process.exit(1);
  }
  totalBlobsCount = parseInt(processArguments[2], 10);
  pageSize = parseInt(processArguments[3], 10);
  console.log('Starting continuationSample.');
  // Create the container
  createContainer(container).then((container) => {
    console.log(`Created the container ${container}`);
    console.log('Entering createBlobs.');
    // Upload blobs from text.
    createBlobs(totalBlobsCount, () => {
      let options = {
        maxResults: pageSize,
        include: 'metadata',
        locationMode: azure.StorageUtilities.LocationMode.PRIMARY_THEN_SECONDARY
      };
      console.log('Entering listBlobs.');
      // List blobs using continuation tokens.
      listBlobs(options, null, () => {
        // Delete the container
        deleteContainer(container)
        .then((container) => console.log(`Deleted the container ${container}`))
        .catch((error) => console.error(error));
      });
    });
  }).catch((error) => console.error(error));
}

let createContainer = (container) => {
  return new Promise((resolve, reject) => {
    // Create the container.
    blobService.createContainerIfNotExists(container, (error) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        resolve(container);
      }
    });
  });
}

let createBlobs = (currentBlobsCount, callback) => {
  // Upload totalBlobsCount blobs to the container.
  const options = {};
  options.metadata = {
    'hello': 'world'
  };

  blobService.createBlockBlobFromText(container, blob + currentBlobsCount, 'blob' + currentBlobsCount, options, (error) => {
    if (error) {
      console.log(error);
    } else if (currentBlobsCount > 1) {
      createBlobs(--currentBlobsCount, callback);
    } else {
      console.log(' Created ' + totalBlobsCount + ' blobs.');
      callback();
    }
  });
}

let listBlobs = (options, token, callback) => {
  blobService
    .listBlobsSegmented(container, token, options, (error, result) => {
      blobs
        .push
        .apply(blobs, result.entries);
      var token = result.continuationToken;
      if (token) {
        console.log(' Received a page of results. There are ' + result.entries.length + ' blobs on this page.');
        listBlobs(options, token, callback);
      } else {
        console.log(' Completed listing. There are ' + blobs.length + ' blobs');
        callback();
      }
    });
}

let deleteContainer = (container) => {
  console.log('Ending continuationSample.');
  return new Promise((resolve, reject) => {
    // Delete the container.
    blobService.deleteContainerIfExists(container, (error) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        resolve(container);
      }
    });
  });
}

continuationSample();
