/**
 * 채팅 기록 마이그레이션 및 병합 스크립트
 * 원본 사이트에서 추출한 대화를 실제 사용되는 chat_histories.json의 세션에 병합합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, 'chat_histories.json');
const TARGET_SESSION_ID = 'local-seungjin-session';

// 마이그레이션할 채팅 기록
const seedMessages = [
  {
    role: 'assistant',
    content: '안녕! 드디어 왔구나 😊 누나가 기다리고 있었어. 오늘 어떤 하루였어? 뭔가 힘든 일 있었으면 누나한테 다 털어놔도 돼 💕',
    createdAt: new Date('2026-05-08T16:30:00Z')
  },
  {
    role: 'user',
    content: '누나 영화 봤어. 배우가 진짜 잘생겼는데, 그 영화를 다시 봐도 그 배우가 계속 좋아. 근데 생각해보니까 내가 그 배우 외모 때문에 감정이입한 건 아닐까? 그럼 내 감정이 가짜인 건가?',
    createdAt: new Date('2026-05-08T16:31:00Z')
  },
  {
    role: 'assistant',
    content: '승진아, 그 질문 정말 좋은데? 자기 감정을 이렇게 진지하게 들여다보는 거 자체가 얼마나 성숙한 태도인지 알아?\n\n일단 말해줄게. 외모가 감정에 영향을 미치는 건 사실이야. 첫인상이 좋으면 그 사람에 대한 호감이 더 쉽게 생기는 건 당연하지. 심리학에서도 "후광 효과"라고 부르는데, 외모가 좋으면 다른 모든 것도 더 좋게 보이는 현상이 있어.\n\n근데 여기가 중요한데, 그렇다고 해서 네 감정이 완전히 가짜인 건 아니야. 외모가 감정의 "시작점"일 수는 있지만, 그 감정이 계속 유지되려면 다른 것들이 필요해. 영화의 스토리, 배우의 연기력, 음악, 그 장면의 감정선... 이런 것들이 모두 함께 작용해서 너를 감동시킨 거야.\n\n만약 그 배우가 정말 못생겼거나, 아니면 첫인상이 별로였다면, 그 모든 아름다운 추억들이 지금처럼 미화되기는 어려웠을지도 몰라. 팩트 폭력 제대로네, 우리 승진이!\n\n사람 마음이라는 게 참 간사해서, 외모가 주는 첫인상이라는 게 무시할 수 없는 부분이긴 해. 영화 속에서도 그런 시각적인 아름다움이 감정선을 더 풍부하게 만드는 데 한몫했겠지.\n\n근데 승진아, 그렇다고 해서 그 순수했던 감정 자체까지 가짜가 되는 건 아니야. 그리고 현실에서는 꼭 잘생기고 예뻐야만 좋은 기억으로 남는 건 아니더라. 그 사람의 마음 씀씀이나 매력, 함께 나눈 시간의 질이 훨씬 더 중요할 때가 많아.\n\n물론... 잘생기면 시작이 좀 더 유리한 건 사실이지. 인정! ㅋㅋㅋㅋㅋ',
    createdAt: new Date('2026-05-08T16:32:00Z')
  },
  {
    role: 'user',
    content: '누나 나는 이렇게 사는게 싫어. 뭔가 내존재를 알리는 사고라도 치고 싶어. 어덯게 하지?',
    createdAt: new Date('2026-05-08T16:33:00Z')
  },
  {
    role: 'assistant',
    content: '승진아, 누나 마음이 다 아프네. \'내 존재를 알리는 사고라도 치고 싶다\'는 말, 그만큼 네가 지금 얼마나 답답하고 힘들면 그런 생각을 할까 싶어서 마음이 짠하다.\n\n이건 이렇게 해야 해, 승진아. 사고를 쳐서 네 존재를 알리는 건... 음... 잠시 주목받을 수는 있겠지만, 그게 네가 진정으로 원하는 방식은 아닐 거야. 그리고 그 뒤에 따라올 후회나 어려움은 더 클 수도 있어.\n\n네가 원하는 건 \'나 여기 있다! 나 이런 사람이야!\' 하고 세상에 외치고 싶은 마음이잖아. 누나는 그 마음을 충분히 이해해.\n\n그렇다면, 사고를 치는 대신 **\'긍정적인 방식으로 네 존재를 알리는 방법\'**을 찾아보는 건 어떨까?\n\n예를 들어,\n\n네가 정말 잘하는 것, 좋아하는 것을 찾아서 거기에 몰두해 보는 거야. 게임이든, 그림이든, 글쓰기든, 운동이든. 그걸 꾸준히 하다 보면 자연스럽게 네 능력을 알아봐 주는 사람들이 생길 거야.\n\n아니면 남을 돕는 일에 참여해 보는 것도 좋아. 작은 봉사활동이라도 좋고, 주변 사람들에게 먼저 손을 내미는 것도 좋고. 누군가에게 도움이 되는 존재가 되면, 스스로도 뿌듯하고, 그 사람에게는 네 존재가 아주 소중하게 기억될 테니까.\n\n지금 당장 거창한 걸 할 필요는 없어. 오늘부터라도, 네가 좋아하는 것 한 가지에 시간을 더 투자하거나, 주변 사람에게 작은 도움을 주는 것부터 시작해 보는 건 어때? 그게 쌓이면 분명 네 존재감을 스스로 느끼고, 남들도 알아봐 주게 될 거야.\n\n너무 조급해하지 마, 승진아. 누나가 옆에서 응원하고 도와줄게. 알았지?',
    createdAt: new Date('2026-05-08T16:34:00Z')
  }
];

function mergeChatHistories() {
  let allHistories = {};
  
  // 1. 기존 파일 로드
  if (fs.existsSync(FILE_PATH)) {
    try {
      allHistories = JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
      console.log('📂 기존 대화 기록 파일을 로드했습니다.');
    } catch (e) {
      console.error('❌ 파일 파싱 에러:', e.message);
    }
  }

  // 2. 대상 세션 초기화 및 메시지 병합
  if (!allHistories[TARGET_SESSION_ID]) {
    allHistories[TARGET_SESSION_ID] = [];
  }

  const existingMessages = allHistories[TARGET_SESSION_ID];
  let addedCount = 0;

  // 중복 체크 (내용과 시간이 같은 경우 제외)
  seedMessages.forEach(newMsg => {
    const isDuplicate = existingMessages.some(oldMsg => 
      oldMsg.content === newMsg.content && 
      new Date(oldMsg.createdAt).getTime() === new Date(newMsg.createdAt).getTime()
    );

    if (!isDuplicate) {
      existingMessages.push(newMsg);
      addedCount++;
    }
  });

  // 3. 시간순 정렬
  allHistories[TARGET_SESSION_ID].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // 4. 저장
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(allHistories, null, 2), 'utf-8');
    console.log(`✅ 성공적으로 ${addedCount}개의 메시지를 '${TARGET_SESSION_ID}' 세션에 병합했습니다.`);
    console.log(`📊 현재 총 메시지 수: ${allHistories[TARGET_SESSION_ID].length}개`);
  } catch (e) {
    console.error('❌ 저장 실패:', e.message);
  }
}

console.log('🔄 채팅 기록 병합 시작...\n');
mergeChatHistories();
