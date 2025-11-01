import {MigrationInterface, QueryRunner} from "typeorm";

export class PerunChannel1752560937986 implements MigrationInterface {
    name = 'PerunChannel1752560937986'

    public async up(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`CREATE TABLE "perun_channel" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" varchar NOT NULL, "allocation" varchar NOT NULL, "data" varchar NOT NULL, "isFinal" varchar NOT NULL, "version" varchar NOT NULL, "createdAt" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP))`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`DROP TABLE "perun_channel"`)
    }

}
