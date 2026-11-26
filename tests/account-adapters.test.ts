import {describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {chatSchema,connectionTestSchema,type ChatRequest} from '../packages/contracts/src/index';
import {upstream} from '../apps/api/src/adapters';
import {createServer} from '../apps/api/src/server';

function request():ChatRequest{return {request_id:randomUUID(),conversation_id:randomUUID(),user_message_id:randomUUID(),assistant_message_id:randomUUID(),connection_id:randomUUID(),provider:'openai',model:'allowed-model',context:{schema_version:1,instructions:'Project instructions',messages:[{role:'user',content:[{type:'text',text:'Hello'}]}],sources:[],snapshot_hash:'test'},max_output_tokens:1024,stream:true}}
describe('account-specific API contracts',()=>{
 it('does not pass unsupported parameters to ChatGPT-plan Responses requests',()=>{const req={...request(),auth_mode:'chatgpt' as const};expect(chatSchema.safeParse(req).success).toBe(true);const result=upstream(req,'oauth-access-test');expect(result.url).toBe('https://api.openai.com/v1/responses');expect(result.headers.Authorization).toBe('Bearer oauth-access-test');expect(result.body).toMatchObject({store:false,stream:true});expect(result.body).not.toHaveProperty('max_output_tokens');expect(result.body).not.toHaveProperty('previous_response_id');expect(JSON.stringify(result.body)).not.toContain('oauth-access-test')});
 it('preserves output limits for ordinary API key requests',()=>{expect(upstream(request(),'test').body).toHaveProperty('max_output_tokens',1024)});
 it('uses Bearer auth and a quota project for Google OAuth, without a query-string key',()=>{const req:ChatRequest={...request(),provider:'google',auth_mode:'google_oauth',quota_project:'my-cloud-project'};expect(chatSchema.safeParse(req).success).toBe(true);const result=upstream(req,'google-access-test');expect(result.headers).toEqual({Authorization:'Bearer google-access-test','x-goog-user-project':'my-cloud-project'});expect(result.url).not.toContain('google-access-test');expect(result.headers).not.toHaveProperty('x-goog-api-key')});
 it('rejects routing OAuth tokens to a different provider or omitting Google billing context',()=>{expect(chatSchema.safeParse({...request(),provider:'anthropic',auth_mode:'chatgpt'}).success).toBe(false);expect(chatSchema.safeParse({...request(),provider:'openai',auth_mode:'google_oauth',quota_project:'project-test'}).success).toBe(false);expect(connectionTestSchema.safeParse({provider:'google',model:'m',auth_mode:'google_oauth'}).success).toBe(false)});
 it('checks ChatGPT models through the documented catalog instead of an unsupported single-model route',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify({models:[{slug:'allowed-model',visibility:'list'}]}),{headers:{'Content-Type':'application/json'}}));const app=createServer({token:'local-test',fetcher:fetcher as typeof fetch});const response=await app.inject({method:'POST',url:'/v1/connections/test',headers:{authorization:'Bearer local-test','x-provider-key':'canary-oauth-test'},payload:{provider:'openai',model:'allowed-model',auth_mode:'chatgpt'}});
  expect(response.statusCode).toBe(200);expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/models');expect(response.body).not.toContain('canary-oauth-test');await app.close();
 });
});
