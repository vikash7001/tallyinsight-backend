

/**
 * Pull stock data from Tally Prime via HTTP/XML
 * Step B: connectivity + raw XML only
 */
export async function pullStockFromTally(companyName) {
  const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>StockItems</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="StockItems" ISMODIFY="No">
            <TYPE>StockItem</TYPE>
            <FETCH>
              Name,
              GUID,
              ClosingBalance,
              BaseUnits
            </FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>
  `.trim();

  const response = await fetch('http://localhost:9000', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml'
    },
    body: xmlRequest
  });

  if (!response.ok) {
    throw new Error(`Tally HTTP error: ${response.status}`);
  }

  const xml = await response.text();
  return xml;
}
export function parseStockItems(xml) {
  if (!xml || typeof xml !== 'string') return [];

  const items = [];
  const stockItemRegex = /<STOCKITEM[\s\S]*?<\/STOCKITEM>/gi;
  const blocks = xml.match(stockItemRegex) || [];

  for (const block of blocks) {
    const guid = getTag(block, 'GUID');
    const name = getTag(block, 'NAME');
    const uom = getTag(block, 'BASEUNITS');
    const closing = getTag(block, 'CLOSINGBALANCE');

    if (!guid || !closing) continue;

    const qty = Number(
      closing.replace(/[^\d.-]/g, '')
    );

    items.push({
      tally_guid: guid.trim(),
      item_name: name ? name.trim() : '',
      uom: uom ? uom.trim() : '',
      quantity: isNaN(qty) ? 0 : qty
    });
  }

  return items;
}

function getTag(xml, tag) {
  const match = xml.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  );
  return match ? match[1] : null;
}
