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

require('dotenv').config();
import { promisify } from 'util';
import * as fs from 'fs';
import * as azure from 'azure-storage';
import { ErrorOrResult, BlobService } from 'azure-storage';

const [readDirAsync, stAsync, existsAsync] = [
  fs.readdir,
  fs.stat,
  fs.exists,
].map(f => promisify(f));

const container = 'updownsample3',
  blob = 'updownsample',
  blobAccess = 'updownaccesssample';

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

const uploadSample = async () => {
  const [, , srcPath, destPath] = process.argv;
  if (!srcPath || !destPath) {
    console.log('Incorrect number of arguments. Should be: srcPath destPath');
    process.exit(1);
  }
  console.log('Starting blobuploaddownloadsample.');
  //
  try {
    // Create the container
    console.log('Create the container');
    await createContainer(container);
    // upload all files
    await uploadBlobs(srcPath, container);
    // Delete the container
    console.log('Delete the container');
    await deleteContainer(container);
  } catch (error) {
    console.error(error);
  }
};

// Create the container
const createContainer = async (container: string) => {
  return new Promise<string>((resolve, reject) =>
    blobService.createContainerIfNotExists(
      container,
      error => (error ? reject(error) : resolve()),
    ),
  );
};
// Delete the container
const deleteContainer = async (container: string) => {
  return new Promise((resolve, reject) =>
    blobService.deleteContainerIfExists(
      container,
      error => (error ? reject(error) : resolve()),
    ),
  );
};
// Demonstrates how to upload all files from a given directory
const uploadBlobs = async (srcPath: string, container: string) => {
  return new Promise(async (resolve, reject) => {
    console.log('Entering uploadBlobs.');
    // validate directory is valid.
    if ((await existsAsync(srcPath)) === false) {
      reject(new Error(srcPath + ' is an invalid directory path.'));
    } else {
      const files: string[] = await getFiles(srcPath);
      for (let file of files) {
        const blobName = file.replace(/^.*[\\\/]/, '');
        const results = await createBlockBlobFromLocalFileAsync(
          container,
          blobName,
          file,
        );
        console.log(`Upload of: ${results.name} finished`);
      }
      console.log('All files uploaded');
      resolve(true);
    }
  });
};

const createBlockBlobFromLocalFileAsync = (
  container: string,
  blobName: string,
  file: string,
): Promise<BlobService.BlobResult> => {
  return new Promise((resolve, reject) => {
    blobService.createBlockBlobFromLocalFile(
      container,
      blobName,
      file,
      (error: Error, result: BlobService.BlobResult) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      },
    );
  });
};
/**
 *
 *
 * @param {string} srcPath
 * @returns
 */
const getFiles = async (srcPath: string) => {
  let files = new Array<string>();
  const results = await readDirAsync(srcPath);
  for (let file of results) {
    const path = `${srcPath}/${file}`;
    const stat = await stAsync(path);
    if (stat && stat.isFile()) {
      files.push(path);
    } else {
      let nested = await getFiles(path);
      files = [...files, ...nested];
    }
  }
  return files;
};

uploadSample();
/*
function uploadSample() {


  // Create the container
  createContainer(container, function () {

    // Demonstrates how to upload all files from a given directoy
    uploadBlobs(srcPath, container, function () {

      // Demonstrates how to download all files from a given
      // blob container to a given destination directory.
      downloadBlobs(container, destPath, function () {

        // Demonstrate making requests using AccessConditions.
        useAccessCondition(container, function () {

          // Delete the container
          deleteContainer(container, function () {
            console.log('Ending blobuploaddownloadsample.');
          });
        });
      });
    });
  });
}


function downloadBlobs(containerName, destinationDirectoryPath, callback) {
  console.log('Entering downloadBlobs.');

  // Validate directory
  if (!fs.existsSync(destinationDirectoryPath)) {
    console.log(destinationDirectoryPath + ' does not exist. Attempting to create this directory...');
    fs.mkdirSync(destinationDirectoryPath);
    console.log(destinationDirectoryPath + ' created.');
  }

  // NOTE: does not handle pagination.
  blobService.listBlobsSegmented(containerName, null, function (error, result) {
    if (error) {
      console.log(error);
    } else {
      var blobs = result.entries;
      var blobsDownloaded = 0;

      blobs.forEach(function (blob) {
          blobService.getBlobToLocalFile(containerName, blob.name, destinationDirectoryPath + '/' + blob.name, function (error2) {
          blobsDownloaded++;

          if (error2) {
            console.log(error2);
          } else {
            console.log(' Blob ' + blob.name + ' download finished.');

            if (blobsDownloaded === blobs.length) {
              // Wait until all workers complete and the blobs are downloaded
              console.log('All files downloaded');
              callback();
            }
          }
        });
      });
    }
  });
}

function useAccessCondition(containerName, callback) {
  console.log('Entering useAccessCondition.');

  // Create a blob.
  blobService.createBlockBlobFromText(containerName, blobAccess, 'hello', function (error, blobInformation) {
    if (error) {
      console.log(error);
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
          callback();
        } else {
          console.log(' Blob was incorrectly updated');
          if (error2) {
            console.log(error2);
          }
        }
      });
    }
  });
}
*/
