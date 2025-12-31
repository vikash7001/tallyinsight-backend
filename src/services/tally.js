

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
