import { DataSource } from "typeorm"
import { GeneratedCode } from "./models/Code"


export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "meeseeks",
  password: "meeseeks",
  database: "meeseeks",
  synchronize: true,
  logging: true,
  entities: [GeneratedCode],
  subscribers: [],
  migrations: [],
})

export async function storeCode(traceId: string, spanId: string, attemptId: string, code: string, success: boolean, critique: string) {

  console.warn("STORING CODE...")
  console.warn(traceId, spanId, attemptId)
  console.log(code)
  console.log(success, critique)

  const gen = new GeneratedCode()
  gen.traceId = traceId
  gen.spanId = spanId
  gen.attemptId = attemptId
  gen.code = code
  gen.success = success
  gen.critique = critique

  await AppDataSource.manager.save(gen)
}
