import { BaseSchema, Prop, Schema } from "@nest/mongo";

@Schema()
export class User extends BaseSchema {
  @Prop({
    required: true,
  })
  email: string;

  @Prop({
    required: true,
    // index: true,
    // sparse: true,
    // unique: true,
  })
  username: string;
}

export type UserKey = keyof User;
export type UserKeys = UserKey[];
