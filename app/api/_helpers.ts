import {getChatGPTUser} from "../chatgpt-auth";import {getDb} from "../../db";import {members} from "../../db/schema";
export async function authenticatedDb(){const user=await getChatGPTUser();if(!user)return null;const db=getDb();await db.insert(members).values({id:user.userId,email:user.email,displayName:user.displayName}).onConflictDoUpdate({target:members.id,set:{email:user.email,displayName:user.displayName}});return {db,user};}
export function clean(value:unknown,max=4000){return typeof value==="string"?value.trim().slice(0,max):"";}
