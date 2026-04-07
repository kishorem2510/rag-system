#!/usr/bin/env node
import * as dotenv from "dotenv";
dotenv.config();
import * as cdk from "aws-cdk-lib";
import { CognitoStack } from "../lib/cognito-stack";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new CognitoStack(app, "RAGSystemCognitoStack", { env });
new InfraStack(app, "RAGSystemInfraStack", { env });