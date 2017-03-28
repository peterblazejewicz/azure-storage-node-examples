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
* Demonstrates how to define a customized retry policy.
*
* In this sample, we define a customized retry policy which retries on the "The specified container is being deleted"
* exception besides the server exceptions.
*
* Note that only in the cloud(not the storage emulator), "The specified container is being deleted" exceptions will be
* sent if users immediately recreate a container after delete it.
*/

const fs = require('fs');
const azure = require('azure-storage')

const RetryPolicyFilter = azure.RetryPolicyFilter;
const LocationMode = azure.StorageUtilities.LocationMode;
const container = 'customretrypolicysample';
let blobService = null;

let setRetryPolicy = (container) => {
  console.log('Starting continuationSample.');
  // Step 1 : Set the retry policy to customized retry policy which will not retry
  // on any failing status code other than the excepted one.
  let retryOnContainerBeingDeleted = new RetryPolicyFilter();
  retryOnContainerBeingDeleted.retryCount = 5;
  retryOnContainerBeingDeleted.retryInterval = 5000;
  retryOnContainerBeingDeleted.shouldRetry = function (statusCode, retryData) {
    let date = new Date().toUTCString();
    console.log(`Made the request at ${date}, received StatusCode: ${statusCode}`);
    let retryInfo = {};
    // retries on any bad status code other than 409
    if (statusCode >= 300 && statusCode != 409 && statusCode != 500) {
      retryInfo.retryable = false;
    } else {
      let currentCount = (retryData && retryData.retryCount)
        ? retryData.retryCount
        : 0;
      retryInfo = {
        retryInterval: this.retryInterval + 2000 * currentCount,
        retryable: currentCount < this.retryCount
      };
    }
    return retryInfo;
  };
  blobService = azure
    .createBlobService()
    .withFilter(retryOnContainerBeingDeleted);
  // optionally set a proxy
  /*const proxy = {
    protocol: 'http:',
    host: '127.0.0.1',
    port: 8888
  };
  blobService.setProxy(proxy);*/
  // Step 2: Create the container
  createContainer(container).then((data) => {
    console.log('Container info:');
    console.log(data.result);
    console.log(`Created the container ${data.container}`);
    // Step 3: Fetch attributes from the container using
    // LocationMode.SECONDARY_THEN_PRIMARY
    return fetchAttributesContainer(data.container);
  }).then((container) => {
    console.log(`Downloaded container properties from ${container}`);
    // Step 4: Lease the container
    return leaseContainer(container);
  }).then((data) => {
    console.log(`Acquired lease from ${data.container} with leaseid ${data.result.id}`);
    // Step 5: Lease the container again, retrying until it succeeds
    return leaseContainer(data.container);
  }).then((data) => {
    // Step 6: Delete the container
    return deleteContainer(container);
  }).then((container) => {
    console.log('Deleted the container ' + container);
    console.log('Ending continuationSample.');
  }).catch((error) => console.error(error));
}

let createContainer = (container) => {
  console.log('Entering createContainer.');
  return new Promise((resolve, reject) => {
    // Create the container.
    blobService.createContainerIfNotExists(container, (error, result, response) => {
      if (error) {
        reject(error);
      } else {
        resolve({container, result})
      }
    });
  });
}

let fetchAttributesContainer = (container) => {
  console.log('Entering fetchAttributesContainer.');
  return new Promise((resolve, reject) => {
    let options = {
      locationMode: LocationMode.SECONDARY_THEN_PRIMARY
    };
    // Get the properties of the container.
    blobService.getContainerProperties(container, options, (error, result, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(container);
      }
    });
  });
}

let leaseContainer = (container) => {
  console.log('Entering leaseContainer.');
  return new Promise((resolve, reject) => {
    // Try to acquire the lease.
    blobService.acquireLease(container, null, {
      leaseDuration: 15
    }, (error, result, response) => {
      if (error) {
        reject(error);
      } else {
        resolve({container, result});
      }
    });
  });
}

function deleteContainer(container) {
  console.log('Entering deleteContainer.');
  let serviceBreakLease = (container) => {
    return new Promise((resolve, reject) => {
      blobService.breakLease(container, null, {
        leaseBreakPeriod: 0
      }, (error, result, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(container);
        }
      });
    })
  };
  let serviceDeleteContainer = (container) => {
    return new Promise((resolve, reject) => {
      // Delete the container.
      blobService.deleteContainer(container, (error, result, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(container);
        }
      });
    });
  };
  return serviceBreakLease(container).then((container) => {
    console.log(' Broke the lease on the container ' + container);
    return serviceDeleteContainer(container);
  });
}

setRetryPolicy(container);
