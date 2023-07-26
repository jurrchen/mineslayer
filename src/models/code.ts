import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class GeneratedCode {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    traceId: string

    @Column()
    spanId: string

    @Column()
    attemptId: string

    @Column("text")
    code: string

    @Column()
    success: boolean

    @Column("text")
    critique: string
    // execution result
}
