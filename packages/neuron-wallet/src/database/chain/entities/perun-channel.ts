import { Column, PrimaryGeneratedColumn, Entity } from 'typeorm'

@Entity()
export default class PerunChannel {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'varchar',
  })
  channelId!: string

  @Column({
    type: 'varchar',
  })
  allocation!: string

  @Column({
    type: 'varchar',
  })
  data!: string

  @Column({
    type: 'varchar',
  })
  isFinal!: boolean

  @Column({
    type: 'varchar',
  })
  version!: string

  @Column({
    type: 'varchar',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @Column({
    type: 'varchar',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date

  static fromObject(params: {
    channelId: string
    allocation: object
    data: object
    isFinal: boolean
    version: string
  }) {
    const res = new PerunChannel()
    res.channelId = params.channelId
    res.allocation = JSON.stringify(params.allocation)
    res.data = JSON.stringify(params.data)
    res.isFinal = params.isFinal
    res.version = params.version
    return res
  }

  public toModel() {
    return {
      channelId: this.channelId,
      allocation: JSON.parse(this.allocation),
      data: JSON.parse(this.data),
      isFinal: this.isFinal,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
