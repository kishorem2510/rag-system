import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const uploadBucket = new s3.Bucket(this, "UploadsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: [frontendUrl],
          allowedHeaders: ["*"],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const filesTable = new dynamodb.Table(this, "FilesTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const requestUploadUrlFn = new nodejs.NodejsFunction(this, "RequestUploadUrlFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../lambdas/src/request-upload-url.ts"),
      handler: "handler",
      environment: {
        UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
      },
    });

    const processPdfFn = new nodejs.NodejsFunction(this, "ProcessPdfFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/process-pdf.ts"),
  handler: "handler",
  timeout: cdk.Duration.seconds(60),
  memorySize: 1024,
  environment: {
    UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
    FILES_TABLE_NAME: filesTable.tableName,
  },
});

   const completeUploadFn = new nodejs.NodejsFunction(this, "CompleteUploadFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/complete-upload.ts"),
  handler: "handler",
  environment: {
    FILES_TABLE_NAME: filesTable.tableName,
    PROCESS_PDF_FUNCTION_NAME: processPdfFn.functionName,
  },
});

    const listFilesFn = new nodejs.NodejsFunction(this, "ListFilesFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/list-files.ts"),
  handler: "handler",
  environment: {
    FILES_TABLE_NAME: filesTable.tableName,
  },
});

const getFileFn = new nodejs.NodejsFunction(this, "GetFileFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/get-file.ts"),
  handler: "handler",
  environment: {
    FILES_TABLE_NAME: filesTable.tableName,
  },
});

const deleteFileFn = new nodejs.NodejsFunction(this, "DeleteFileFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/delete-file.ts"),
  handler: "handler",
  environment: {
    FILES_TABLE_NAME: filesTable.tableName,
    UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
  },
});

const getFileContentFn = new nodejs.NodejsFunction(this, "GetFileContentFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/get-file-content.ts"),
  handler: "handler",
  environment: {
    FILES_TABLE_NAME: filesTable.tableName,
    UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
  },
});

const askQuestionFn = new nodejs.NodejsFunction(this, "AskQuestionFn", {
  runtime: lambda.Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../lambdas/src/ask-question.ts"),
  handler: "handler",
  timeout: cdk.Duration.seconds(60),
  memorySize: 1024,
  environment: {
    FILES_TABLE_NAME: filesTable.tableName,
    UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  },
});

    uploadBucket.grantPut(requestUploadUrlFn);
    filesTable.grantWriteData(completeUploadFn);
    filesTable.grantReadData(listFilesFn);
    filesTable.grantReadData(getFileFn);
    uploadBucket.grantReadWrite(processPdfFn);
filesTable.grantReadWriteData(processPdfFn);
processPdfFn.grantInvoke(completeUploadFn);
filesTable.grantReadWriteData(deleteFileFn);
uploadBucket.grantReadWrite(deleteFileFn);
filesTable.grantReadData(getFileContentFn);
uploadBucket.grantRead(getFileContentFn);
filesTable.grantReadData(askQuestionFn);
uploadBucket.grantRead(askQuestionFn);



    const httpApi = new apigwv2.HttpApi(this, "RagSystemHttpApi", {
      corsPreflight: {
        allowHeaders: ["*"],
        allowMethods: [
          apigwv2.CorsHttpMethod.OPTIONS,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowOrigins: [frontendUrl],
      },
    });

    httpApi.addRoutes({
      path: "/upload/request-url",
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "RequestUploadUrlIntegration",
        requestUploadUrlFn
      ),
    });

    httpApi.addRoutes({
      path: "/upload/complete",
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "CompleteUploadIntegration",
        completeUploadFn
      ),
    });

    httpApi.addRoutes({
  path: "/files",
  methods: [apigwv2.HttpMethod.GET],
  integration: new integrations.HttpLambdaIntegration(
    "ListFilesIntegration",
    listFilesFn
  ),
});

httpApi.addRoutes({
  path: "/files/{fileId}",
  methods: [apigwv2.HttpMethod.GET],
  integration: new integrations.HttpLambdaIntegration(
    "GetFileIntegration",
    getFileFn
  ),
});

httpApi.addRoutes({
  path: "/files/{fileId}",
  methods: [apigwv2.HttpMethod.DELETE],
  integration: new integrations.HttpLambdaIntegration(
    "DeleteFileIntegration",
    deleteFileFn
  ),
});

httpApi.addRoutes({
  path: "/files/{fileId}/content",
  methods: [apigwv2.HttpMethod.GET],
  integration: new integrations.HttpLambdaIntegration(
    "GetFileContentIntegration",
    getFileContentFn
  ),
});

httpApi.addRoutes({
  path: "/ask",
  methods: [apigwv2.HttpMethod.POST],
  integration: new integrations.HttpLambdaIntegration(
    "AskQuestionIntegration",
    askQuestionFn
  ),
});


    new cdk.CfnOutput(this, "UploadsBucketName", {
      value: uploadBucket.bucketName,
    });

    new cdk.CfnOutput(this, "FilesTableName", {
      value: filesTable.tableName,
    });

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.apiEndpoint,
    });
  }
}