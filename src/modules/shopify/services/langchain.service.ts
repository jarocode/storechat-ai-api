import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { Document } from 'langchain/document';

@Injectable()
export class LangchainService {
  private supa = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );
  private embed = new OpenAIEmbeddings();
  private splitter = new CharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  async ingest(docs: Document[]) {
    const chunks = await this.splitter.splitDocuments(docs);
    await SupabaseVectorStore.fromDocuments(chunks, this.embed, {
      client: this.supa,
    });
  }
}
