import { Column, PrimaryGeneratedColumn, Entity } from 'typeorm'

@Entity()
export default class PerunChannelInfo {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({
    type: 'varchar',
  })
  channelId!: string
  
  @Column({
    type: 'varchar',
  })
  mePublicKey!: string

  @Column({
    type: 'varchar',
  })
  meAddress!: string

  @Column({
    type: 'varchar',
  })
  peerPublicKey!: string

  @Column({
    type: 'varchar',
  })
  peerAddress!: string

  @Column({
    type: 'varchar',
  })
  payload!: string

  @Column()
  myPayloadIndex!: number

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

  static fromObject(params: Perun.ChannelInfo) {
    const res = new PerunChannelInfo()
    res.channelId = params.channelId
    res.meAddress = params.me.address
    res.mePublicKey = params.me.publicKey
    res.peerAddress = params.peer.address
    res.peerPublicKey = params.peer.publicKey
    res.payload = JSON.stringify(params.payload)
    res.myPayloadIndex = params.myPayloadIndex
    return res
  }

  public toModel(): Perun.ChannelInfo {
    return {
      channelId: this.channelId,
      me: {
        address: this.meAddress,
        publicKey: this.mePublicKey,
      },
      peer: {
        address: this.peerAddress,
        publicKey: this.peerPublicKey,
      },
      payload: JSON.parse(this.payload),
      myPayloadIndex: this.myPayloadIndex as Perun.ChannelInfo['myPayloadIndex'],
      // createdAt: this.createdAt,
      // updatedAt: this.updatedAt,
    }
  }
}
