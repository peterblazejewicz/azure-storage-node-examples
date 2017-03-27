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

const blobService = azure
  .createBlobService()
  .withFilter(new azure.ExponentialRetryPolicyFilter());

// optionally set a proxy
/*let proxy = {
  protocol: 'http:',
  host: '127.0.0.1',
  port: 8888
};

blobService.setProxy(proxy);
*/

let continuationSample = (container, blob) => {
  const processArguments = process.argv;
  if (processArguments.length !== 4) {
    console.log('Incorrect number of arguments. Should be: numBlobs pageSize [deleteContainer]\nT' +
        'ry: 51 10');
    process.exit(1);
  }
  let totalBlobsCount = parseInt(processArguments[2], 10);
  let pageSize = parseInt(processArguments[3], 10);
  console.log('Starting continuationSample.');
  // Create the container
  createContainer(container).then((results) => {
    console.log(`Created the container ${results.container}`);
    // Upload blobs from text.
    console.log('Entering createBlobs.');
    return createBlobs(results.container, blob, totalBlobsCount);
  }).then((results) => {
    let options = {
      maxResults: pageSize,
      include: 'metadata',
      locationMode: azure.StorageUtilities.LocationMode.PRIMARY_THEN_SECONDARY
    };
    console.log('Entering listBlobs.');
    // List blobs using continuation tokens.
    return getAllBlobs(results.container, options);
  }).then((blobs) => {
    console.log(`Completed listing. There are ${blobs.length} blobs`);
    // Delete the container
    return deleteContainer(container);
  }).then((results) => console.log(`Deleted the container ${results.container}`))
  .catch((error) => console.error(error));
}

let createContainer = (container) => {
  return new Promise((resolve, reject) => {
    // Create the container.
    blobService.createContainerIfNotExists(container, (error) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        resolve({container});
      }
    });
  });
}

let createBlobs = (container, blob, counter) => {
  // Upload totalBlobsCount blobs to the container.
  return new Promise((resolve, reject) => {
    const options = {
      metadata: {
        'hello': 'world'
      }
    };
    blobService.createBlockBlobFromText(container, blob + counter, 'blob' + counter, options, (error, result, response) => {
      if (error) {
        reject(error);
      } else {
        if (counter > 0) {
          createBlobs(container, blob, counter - 1).then((results) => {
            resolve(results);
          });
        } else {
          resolve({container});
        }
      }
    });
  });
}

let getAllBlobs = (container, options) => {
  const getBlobs = (continuationToken = null) => new Promise((resolve, reject) => {
    blobService.listBlobsSegmented(container, continuationToken, options, (error, result, response) => {
      if (error) {
        reject(error);
      } else {
        if (result.continuationToken) {
          console.log(`Received a page of results. There are ${result.entries.length} blobs on this page.`);
          getBlobs(result.continuationToken).then((entries) => {
            resolve(result.entries.concat(entries));
          });
        } else {
          console.log(`Current blobs: ${result.entries.length}`);
          resolve(result.entries);
        }
      }
    });
  });
  return getBlobs();
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
        resolve({container});
      }
    });
  });
}

continuationSample(container, blob);
