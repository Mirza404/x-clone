import mongoose from 'mongoose';

type ObjectIdLike = mongoose.Types.ObjectId | string;

function toObjectId(id: ObjectIdLike): mongoose.Types.ObjectId {
  return id instanceof mongoose.Types.ObjectId
    ? id
    : new mongoose.Types.ObjectId(id);
}

function hasObjectId(values: ObjectIdLike[], id: ObjectIdLike): boolean {
  const target = id.toString();
  return values.some((value) => value.toString() === target);
}

export { hasObjectId, toObjectId };
