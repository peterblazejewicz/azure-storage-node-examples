// 
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
* 1. Demonstrates how to upload all files from a given directory in parallel
* 
* 2. Demonstrates how to download all files from a given blob container to a given destination directory.
* 
* 3. Demonstrate making requests using AccessConditions.
*/

var fs = require('fs');

var azure;
if (fs.existsSync('absolute path to azure-storage.js')) {
  azure = require('absolute path to azure-storage');
} else {
  azure = require('azure-storage');
}

var container = 'updownsample3';
var blob = 'updownsample';
var blobAccess = 'updownaccesssample';

var blobService = azure.createBlobService()
      .withFilter(new azure.ExponentialRetryPolicyFilter());

// optionally set a proxy
/*var proxy = {
  protocol: 'http:',
  host: '127.0.0.1',
  port: 8888
};

blobService.setProxy(proxy);
*/

function uploadSample() {
  var processArguments = process.argv;
  if (processArguments.length !== 4) {
    console.log('Incorrect number of arguments. Should be: srcPath destPath');
    process.exit(1);
  } 

  var srcPath = processArguments[2];
  var destPath = processArguments[3];

  console.log('Starting blobuploaddownloadsample.');

  // Create the container
  createContainer(container)
  .then(function(container) {
    console.log('Created the container ' + container);
    // Demonstrates how to upload all files from a given directoy
    return uploadBlobs(srcPath, container);
  })
  .then(function(container) {
    // Demonstrates how to download all files from a given
    // blob container to a given destination directory.
    return downloadBlobs(container, destPath);
  })
  .then(function(container) {
      // Demonstrate making requests using AccessConditions.
      return useAccessCondition(container);
  })
  .then(function(container) {
      console.log('Ending blobuploaddownloadsample.');
      return deleteContainer(container);
  })
  .then(function() {
    console.log('Deleted the container ' + container);
  })
  .catch(function(error) {
    console.error(error);
  });
}

function createContainer (container) {
  return new Promise(function(resolve, reject) {
    // Create the container.
    blobService.createContainerIfNotExists(container, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve(container);
      }
    });
  });
}

function uploadBlobs(sourceDirectoryPath, containerName) {
  console.log('Entering uploadBlobs.');
  return new Promise(function(resolve, reject) {
    // validate directory is valid.
    if (!fs.existsSync(sourceDirectoryPath)) {
      reject(sourceDirectoryPath + ' is an invalid directory path.');
    } else {
      // Search the directory and generate a list of files to upload.
      listAllFiles(sourceDirectoryPath)
      .then(function(files) {
        var finished = 0;
        // generate and schedule an upload for each file
        files.forEach(function (file) {
          var blobName = file.replace(/^.*[\\\/]/, '');
          blobService.createBlockBlobFromLocalFile(containerName, blobName, file, function (error) {
            finished++;
            if (error) {
              reject(error);
            } else {
              console.log(' Blob ' + blobName + ' upload finished.');
              if (finished === files.length) {
                // Wait until all workers complete and the blobs are uploaded to the server.
                console.log('All files uploaded');
                resolve(containerName);
              }
            }
          });
        });
      })
      .catch(function(error) {
        reject(error);
      });
    }
  });
}

function downloadBlobs(containerName, destinationDirectoryPath) {
  console.log('Entering downloadBlobs.');
  return new Promise(function(resolve, reject) {
    // Validate directory
    if (!fs.existsSync(destinationDirectoryPath)) {
      console.log(destinationDirectoryPath + ' does not exist. Attempting to create this directory...');
      fs.mkdirSync(destinationDirectoryPath);
      console.log(destinationDirectoryPath + ' created.');
    }
    // NOTE: does not handle pagination.
    blobService.listBlobsSegmented(containerName, null, function (error, result) {
      if (error) {
        reject(error);
      } else {
        var blobs = result.entries;
        var blobsDownloaded = 0;
        blobs.forEach(function (blob) {
            blobService.getBlobToLocalFile(containerName, blob.name, destinationDirectoryPath + '/' + blob.name, function (error2) {
            blobsDownloaded++;

            if (error2) {
              reject(error2);
            } else {
              console.log(' Blob ' + blob.name + ' download finished.');
              if (blobsDownloaded === blobs.length) {
                // Wait until all workers complete and the blobs are downloaded
                console.log('All files downloaded');
                resolve(containerName);
              }
            }
          });
        });
      }
    });
  });
}

function useAccessCondition(containerName) {
  console.log('Entering useAccessCondition.');
  return new Promise(function(resolve, reject) {
    // Create a blob.
    blobService.createBlockBlobFromText(containerName, blobAccess, 'hello', function (error, blobInformation) {
      if (error) {
        reject(error);
      } else {
        console.log(' Created the blob ' + blobInformation.name);
        console.log(' Blob Etag is: ' + blobInformation.etag);
        // Use the If-not-match ETag condition to access the blob. By
        // using the IfNoneMatch condition we are asserting that the blob needs
        // to have been modified in order to complete the request. In this
        // sample no other client is accessing the blob, so this will fail as
        // expected.
        var options = { accessConditions: { EtagNonMatch: blobInformation.etag} };
        blobService.createBlockBlobFromText(containerName, blobInformation.name, 'new hello', options, function (error2) {
          if (error2 && error2.statusCode === 412 && error2.code === 'ConditionNotMet') {
            console.log('Attempted to recreate the blob with the if-none-match access condition and got the expected exception.');
            resolve(containerName);
          } else {
            reject('Blob was incorrectly updated');
          }
        });
      }
    });
  });
}

function deleteContainer (container) {
  return new Promise(function(resolve, reject) {
    // Delete the container.
    blobService.deleteContainerIfExists(container, function (error) {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Utility function

function listDirectory(dir) {
  return new Promise(function(resolve, reject) {
    fs.readdir(dir, function(error, files) {
      if(error) {
        reject(error);
      } else {
        resolve(files);
      }
    })
  });
}

function getFileStat(file) {
  return new Promise(function(resolve, reject) {
    fs.stat(file, function(error, stat) {
      if(error) {
        reject(error);
      } else {
        resolve(stat);
      }
    });
  });
}

function listAllFiles(dir) {
  return listDirectory(dir)
  .then(function(files) {
    return Promise.all(files.map(function(file) {
      file = dir + '/' + file;
      return getFileStat(file)
      .then(function(stat) {
        if(stat.isDirectory()) {
          return listAllFiles(file);
        } else {
          return file;
        }
      });
    }));
  })
  .then(function(files) {
    return Array.prototype.concat.apply([], files);
  });
}

uploadSample();
