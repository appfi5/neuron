import {MigrationInterface, QueryRunner} from "typeorm";

export class PerunActivity1752560937986 implements MigrationInterface {
    name = 'PerunActivity1752560937986'

    public async up(queryRunner: QueryRunner): Promise<any> {
      await queryRunner.query(`CREATE TABLE "perun_activity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "channelId" varchar NOT NULL, "status" varchar NOT NULL, "timestamp" varchar NOT NULL, "createdAt" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP))`)
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "perun_activity"`)
    }

}
