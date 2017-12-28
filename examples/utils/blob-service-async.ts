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
}
