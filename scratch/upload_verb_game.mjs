import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(
  env.split('\n').map(l => l.trim().split('=')).filter(p => p.length === 2)
);
const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const htmlPath = 'c:/Users/panth/Documents/vibecoding/260803_oneday_class1/docs/문장의 심장, [동사]를 찾아라!.html';

async function run() {
  console.log('1. Reading local HTML file...');
  const buffer = fs.readFileSync(htmlPath);
  console.log('   File size:', (buffer.length / 1024).toFixed(1), 'KB');

  const targetPath = '44/verb-finder-game.html';
  console.log('2. Uploading to Supabase Storage:', targetPath);
  const { error: upErr } = await supabase.storage
    .from('workshop-final-results')
    .upload(targetPath, buffer, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });
  if (upErr) {
    console.error('Upload error:', upErr);
    return;
  }

  const publicUrl = supabase.storage
    .from('workshop-final-results')
    .getPublicUrl(targetPath).data.publicUrl;
  console.log('   Public URL:', publicUrl);

  console.log('3. Updating participant 44 step 3 submission...');
  const { data: updatedSub, error: updateErr } = await supabase
    .from('submissions')
    .update({
      data_json: {
        gameTitle: '문장의 심장, [동사]를 찾아라!',
        resultUrl: publicUrl,
        contentPlan: '구문 시각화 및 직독직해 덩어리(Chunking) 지문 제공',
        contentTitle: '영어 문장 구조 파악하기',
        galleryComments: '[]',
        uploadCanceledAt: '',
        uploadedFileName: '문장의 심장, [동사]를 찾아라!.html',
        uploadedFilePath: targetPath,
        uploadedFileSize: (buffer.length / 1024).toFixed(1) + ' KB',
      },
      updated_at: new Date().toISOString(),
    })
    .eq('participant_id', 44)
    .eq('step', 3)
    .select('*');

  if (updateErr) {
    console.error('Update error:', updateErr);
    return;
  }
  console.log('   Updated submission:', JSON.stringify(updatedSub, null, 2));

  console.log('\n✅ Done! 송지언 선생님 갤러리 작품이 교체되었습니다.');
}

run().catch(console.error);
