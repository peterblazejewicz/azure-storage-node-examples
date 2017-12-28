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
import {
  existsAsync,
  mkdirAsync,
  readDirAsync,
  stAsync,
} from './../utils/promisified';
import BlobServiceAsyncApi from '../utils/blob-service-async';

const container = 'updownsample3',
  blob = 'updownsample',
  blobAccess = 'updownaccesssample';

const blobService = azure
  .createBlobService()
  .withFilter(new azure.ExponentialRetryPolicyFilter());

const asyncBlobService = new BlobServiceAsyncApi(blobService);

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
    await asyncBlobService.createContainerIfNotExists(container);
    // upload all files
    await uploadBlobs(srcPath, container);
    // Demonstrates how to download all files from a given
    // blob container to a given destination directory.
    await downloadBlobs(container, destPath);
    // Demonstrate making requests using AccessConditions.
    await useAccessCondition(container);
    // Delete the container
    console.log('Delete the container');
    await asyncBlobService.deleteContainerIfExists(container);
  } catch (error) {
    console.error(error);
  }
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
        const results = await asyncBlobService.createBlockBlobFromLocalFile(
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

/**
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

/**
 * - create download directory (if not exists)
 * - gets information about blob
 * - for each blob downloads a blob to local file
 *
 * @param {string} containerName
 * @param {string} destinationDirectoryPath
 */
const downloadBlobs = async (
  containerName: string,
  destinationDirectoryPath: string,
) => {
  console.log('Entering downloadBlobs.');
  // Validate directory
  if ((await existsAsync(destinationDirectoryPath)) === false) {
    console.log(
      `${destinationDirectoryPath} does not exist. Attempting to create this directory...`,
    );
    await mkdirAsync(destinationDirectoryPath);
    console.log(`${destinationDirectoryPath} created.`);
  } else {
    console.log(`Directory ${destinationDirectoryPath} already exists`);
  }
  let results = await asyncBlobService.listBlobsSegmented(containerName);
  const blobs = results.entries;
  for (let blob of blobs) {
    await getBlobToLocalFile(
      container,
      blob.name,
      `${destinationDirectoryPath}/${blob.name}`,
    );
  }
  console.log('All files downloaded');
  //
};

/**
 * Returns information about blob
 * @param {string} container
 * @returns {Promise<BlobService.ListBlobsResult>}
 */

/**
 * Asynchronously downloads a blob file to local file
 * @param {string} container
 * @param {string} blobName
 * @param {string} path
 * @returns {Promise<BlobService.BlobResult>}
 */
const getBlobToLocalFile = (
  container: string,
  blobName: string,
  path: string,
): Promise<BlobService.BlobResult> => {
  console.log('getBlobToLocalFile');
  return new Promise((resolve, reject) => {
    blobService.getBlobToLocalFile(
      container,
      blobName,
      path,
      (error, results) => {
        if (error) {
          reject(error);
        } else {
          console.log(`Blob ${blobName} download finished.`);
          resolve(results);
        }
      },
    );
  });
};

/**
 * Async wrapper for {BlobService.createBlockBlobFromText}
 *
 * @param {string} container
 * @param {string} blobAccess
 * @param {string} text
 * @param {BlobService.CreateBlobRequestOptions} [options={}]
 * @returns {Promise<BlobService.BlobResult>}
 */
const createBlockBlobFromTextAsync = (
  container: string,
  blobAccess: string,
  text: string,
  options: BlobService.CreateBlobRequestOptions = {},
): Promise<BlobService.BlobResult> => {
  return new Promise((resolve, reject) => {
    blobService.createBlockBlobFromText(
      container,
      blobAccess,
      text,
      options,
      (error, results) => (error ? reject(error) : resolve(results)),
    );
  });
};

/**
 * Async wrapper
 *
 * @param {string} container
 * @returns {Promise<{}>}
 */
const useAccessCondition = async (container: string): Promise<{}> => {
  return new Promise(async (resolve, reject) => {
    console.log('Entering useAccessCondition.');
    let blobInformation = await createBlockBlobFromTextAsync(
      container,
      blobAccess,
      'hello',
    );
    console.log(`Created the blob ${blobInformation.name}`);
    console.log(`Blob Etag is: ${blobInformation.etag}`);
    // Use the If-not-match ETag condition to access the blob. By
    // using the IfNoneMatch condition we are asserting that the blob needs
    // to have been modified in order to complete the request. In this
    // sample no other client is accessing the blob, so this will fail as
    // expected.
    const options: BlobService.CreateBlobRequestOptions = {
      accessConditions: { EtagNonMatch: blobInformation.etag },
    };
    try {
      blobInformation = await createBlockBlobFromTextAsync(
        container,
        blobInformation.name,
        'new hello',
        options,
      );
      console.log('Blob was incorrectly updated');
      reject('Blob was incorrectly updated');
    } catch (error) {
      if (error.statusCode === 412 && error.code === 'ConditionNotMet') {
        console.log(
          `Attempted to recreate the blob with the if-none-match
          access condition and got the expected exception.`,
        );
        resolve();
      } else {
        reject(error);
      }
    }
  });
};

//
uploadSample();
