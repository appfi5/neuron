import {MigrationInterface, QueryRunner} from "typeorm";

export class PerunChannelInfo1765871943361 implements MigrationInterface {
    name = 'PerunChannelInfo1765871943361'

    public async up(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`CREATE TABLE "perun_channel_info" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" varchar NOT NULL, "mePublicKey" varchar NOT NULL, "meAddress" varchar NOT NULL, "peerPublicKey" varchar NOT NULL, "peerAddress" varchar NOT NULL, "payload" varchar NOT NULL, "myPayloadIndex" integer NOT NULL, "createdAt" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP))`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`DROP TABLE "perun_channel_info"`)
    }

}
