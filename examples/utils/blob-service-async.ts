import * as azure from 'azure-storage';
import { BlobService, ServiceResponse } from 'azure-storage';

export default class BlobServiceAsyncApi {
  constructor(public blobService: azure.BlobService) {}
  // Create the container
  createContainerIfNotExists = async (container: string) => {
    return new Promise<BlobService.ContainerResult>((resolve, reject) =>
      this.blobService.createContainerIfNotExists(
        container,
        (error, results, response) =>
          error ? reject(error) : resolve(results),
      ),
    );
  };

  // Delete the container
  deleteContainerIfExists = async (container: string) => {
    return new Promise<boolean>((resolve, reject) =>
      this.blobService.deleteContainerIfExists(
        container,
        error => (error ? reject(error) : resolve(true)),
      ),
    );
  };

  createBlockBlobFromLocalFile = async (
    container: string,
    blobName: string,
    file: string,
  ) => {
    return new Promise<BlobService.BlobResult>((resolve, reject) => {
      this.blobService.createBlockBlobFromLocalFile(
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
   * Returns information about blob
   * NOTE: does not handle pagination.
   * @param {string} container
   * @returns {Promise<BlobService.ListBlobsResult>}
   */
  listBlobsSegmented = (
    container: string,
  ): Promise<BlobService.ListBlobsResult> => {
    console.log('listBlobsSegmentedAsync');
    return new Promise((resolve, reject) => {
      this.blobService.listBlobsSegmented(
        container,
        null,
        (error, result, response) => (error ? reject(error) : resolve(result)),
      );
    });
  };

  /**
   * Asynchronously downloads a blob file to local file
   * @param {string} container
   * @param {string} blobName
   * @param {string} path
   * @returns {Promise<BlobService.BlobResult>}
   */
  getBlobToLocalFile = (
    container: string,
    blobName: string,
    path: string,
  ): Promise<BlobService.BlobResult> => {
    console.log('getBlobToLocalFile');
    return new Promise((resolve, reject) => {
      this.blobService.getBlobToLocalFile(
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
  createBlockBlobFromText = (
    container: string,
    blobAccess: string,
    text: string,
    options: BlobService.CreateBlobRequestOptions = {},
  ): Promise<BlobService.BlobResult> => {
    return new Promise((resolve, reject) => {
      this.blobService.createBlockBlobFromText(
        container,
        blobAccess,
        text,
        options,
        (error, results) => (error ? reject(error) : resolve(results)),
      );
    });
  };
}
