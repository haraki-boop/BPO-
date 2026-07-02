import { NextResponse } from 'next/server';

// 💡 常に最新のデータを取得するための設定（Next.jsが勝手に古いデータを記憶しないようにする）
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // 1. ダッシュボード画面から「どの現場のデータが欲しいか(location)」を受け取る
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');

    let targetGasUrl = '';

    // 2. 受け取った現場IDに合わせて、金庫(.env.local)から正しいGASのURLを取り出す
    switch (location) {
      // 🏢 ロジ（関東）部門
      case 'showa-reizo': targetGasUrl = process.env.GAS_URL_SHOWA_REIZO || ''; break;
      case 'afs-minamikanto': targetGasUrl = process.env.GAS_URL_MINAMI_KANTO_AFS || ''; break;
      case 'tokyu-store': targetGasUrl = process.env.GAS_URL_TOKYU_STORE || ''; break;
      case 'landport-narashino': targetGasUrl = process.env.GAS_URL_LANDPORT_NARASHINO || ''; break;
      case 'craft-delica': targetGasUrl = process.env.GAS_URL_CRAFT_DELICA_FUNABASHI || ''; break;

      // 🏢 ロジ（中部）部門
      case 'afs-bisai': targetGasUrl = process.env.GAS_URL_OWARI_BISAI_AFS_RYUTSU || ''; break;
      case 'mitsui-chubu': targetGasUrl = process.env.GAS_URL_MITSUI_SHOKUHIN || ''; break;
      case 'yamanaka-shionagi': targetGasUrl = process.env.GAS_URL_YAMANAKA || ''; break;

      // 🏢 ロジ（関西）部門
      case 'cainz-kobe': targetGasUrl = process.env.GAS_URL_KOBE_CAINZ || ''; break;
      case 'cainz-fukuoka': targetGasUrl = process.env.GAS_URL_CAINZ_FUKUOKA || ''; break;
      case 'oie-hannan': targetGasUrl = process.env.GAS_URL_OIYA_SANGYO || ''; break;
      case 'medi-entrance': targetGasUrl = process.env.GAS_URL_MEDI_ENTRANCE || ''; break;

      // 🏢 清掃部門
      case 'afs-bisai-seiso': targetGasUrl = process.env.GAS_URL_OWARI_BISAI_AFS_SEISO || ''; break;
      case 'himeji-afs-seiso': targetGasUrl = process.env.GAS_URL_HYOGO_HIMEJI_AFS_SEISO || ''; break;
      case 'mandai-saito': targetGasUrl = process.env.GAS_URL_MANDAI_SAITO || ''; break;
      case 'mandai-sibukawa': targetGasUrl = process.env.GAS_URL_MANDAI_SIBUKAWA || ''; break;
      
      // 該当しない現場IDが来た場合
      default: targetGasUrl = '';
    }

    // 3. URLが見つからなかった場合のエラーブロック
    if (!targetGasUrl) {
      console.warn(`[API Error] 現場 '${location}' のGAS URLが金庫(.env.local)に設定されていません。`);
      return NextResponse.json({ error: 'GAS URL is not configured for this location.' }, { status: 400 });
    }

    // 4. 正しいURLを使って、サーバーの裏側からこっそりGASと通信する！
    const res = await fetch(targetGasUrl);
    
    if (!res.ok) {
      throw new Error(`GAS API returned status: ${res.status}`);
    }

    // 5. 取得したデータをダッシュボード画面に返す
    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[API Error] Failed to fetch GAS data:', error);
    return NextResponse.json({ error: 'Failed to fetch GAS data' }, { status: 500 });
  }
}