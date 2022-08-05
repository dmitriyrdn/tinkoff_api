/** @OnlyCurrentDoc */
// Спасибо Егору Караваеву за исходный код
// Допилено dmitriy_rdn

const scriptProperties = PropertiesService.getScriptProperties()
const OPENAPI_TOKEN = scriptProperties.getProperty('OPENAPI_TOKEN')

const CACHE = CacheService.getScriptCache()
const CACHE_MAX_AGE = 21600 // 6 Hours

const TRADING_START_AT = new Date('Apr 01, 2020 10:00:00')
const MILLIS_PER_DAY = 1000 * 60 * 60 * 24

/**  
* ============================== Tinkoff V2 ==============================
*
* https://tinkoff.github.io/investAPI/
* https://tinkoff.github.io/investAPI/grpc/
*
**/

class _TinkoffClientV2 {
  constructor(token){
    this.token = token
    this.baseUrl = 'https://invest-public-api.tinkoff.ru/rest/'
    //Logger.log(`[_TinkoffClientV2.constructor]`)
  }
  _makeApiCall(methodUrl,data){
    const url = this.baseUrl + methodUrl
    //Logger.log(`[Tinkoff OpenAPI V2 Call] ${url}`)
    const params = {
      'method': 'post',
      'muteHttpExceptions':true,
      'headers': {'accept': 'application/json', 'Authorization': `Bearer ${this.token}`},
      'contentType': 'application/json',
      'payload' : JSON.stringify(data)}
    
    const response = UrlFetchApp.fetch(url, params)
    if (response.getResponseCode() == 200)
      return JSON.parse(response.getContentText())
  }
  // ----------------------------- InstrumentsService -----------------------------
  _Bonds(instrumentStatus) {
    const url = `tinkoff.public.invest.api.contract.v1.InstrumentsService/Bonds`
    const data = this._makeApiCall(url, {'instrumentStatus': instrumentStatus})
    return data
  }
  _Shares(instrumentStatus) {
    const url = `tinkoff.public.invest.api.contract.v1.InstrumentsService/Shares`
    const data = this._makeApiCall(url, {'instrumentStatus': instrumentStatus})
    return data
  }
  _Futures(instrumentStatus) {
    const url = `tinkoff.public.invest.api.contract.v1.InstrumentsService/Futures`
    const data = this._makeApiCall(url, {'instrumentStatus': instrumentStatus})
    return data
  }
  _Etfs(instrumentStatus) {
    const url = `tinkoff.public.invest.api.contract.v1.InstrumentsService/Etfs`
    const data = this._makeApiCall(url, {'instrumentStatus': instrumentStatus})
    return data
  }
  _Currencies(instrumentStatus) {
    const url = `tinkoff.public.invest.api.contract.v1.InstrumentsService/Currencies`
    const data = this._makeApiCall(url, {'instrumentStatus': instrumentStatus})
    return data
  }
  _CurrencyBy(idType="INSTRUMENT_ID_TYPE_TICKER", classCode="CETS", id="USD000UTSTOM") {
    const url = 'tinkoff.public.invest.api.contract.v1.InstrumentsService/CurrencyBy'
    const data = this._makeApiCall(url,{"idType":idType, "classCode": classCode,"id": id})
    return data
  }
  _GetInstrumentBy(idType,classCode,id) {
    const url = `tinkoff.public.invest.api.contract.v1.InstrumentsService/GetInstrumentBy`
    const data = this._makeApiCall(url, {'idType': idType, 'classCode': classCode, 'id': id})
    return data
  }
  _FindInstrument(query='YNDX') {
    const url = 'tinkoff.public.invest.api.contract.v1.InstrumentsService/FindInstrument'
    const data = this._makeApiCall(url,{'query': query})
    return data
  }

  
  // ----------------------------- MarketDataService -----------------------------
  _GetLastPrices(figi_arr) {
    const url = 'tinkoff.public.invest.api.contract.v1.MarketDataService/GetLastPrices'
    const data = this._makeApiCall(url,{'figi': figi_arr})
    return data
  }
  _GetOrderBookByFigi(figi,depth) {
    const url = `tinkoff.public.invest.api.contract.v1.MarketDataService/GetOrderBook`
    const data = this._makeApiCall(url,{'figi': figi, 'depth': depth})
    return data
  }
  // ----------------------------- OperationsService -----------------------------
  _GetOperations(accountId,from,to,state,figi) {
    const url = 'tinkoff.public.invest.api.contract.v1.OperationsService/GetOperations'
    const data = this._makeApiCall(url,{'accountId': accountId,'from': from,'to': to,'state': state,'figi': figi})
    return data
  }
  _GetPortfolio(accountId) {
    const url = 'tinkoff.public.invest.api.contract.v1.OperationsService/GetPortfolio'
    const data = this._makeApiCall(url,{'accountId': accountId})
    return data
  }
  // ----------------------------- UsersService -----------------------------
  _GetAccounts() {
    const url = 'tinkoff.public.invest.api.contract.v1.UsersService/GetAccounts'
    const data = this._makeApiCall(url,{})
    return data
  }
  _GetInfo() {
    const url = 'tinkoff.public.invest.api.contract.v1.UsersService/GetInfo'
    const data = this._makeApiCall(url,{})
    return data
  }
}

const tinkoffClientV2 = new _TinkoffClientV2(OPENAPI_TOKEN)

function getTickerNameByFIGI(figi) {
  //Logger.log(`[TI_GetTickerByFIGI] figi=${figi}`)   // DEBUG
  //Logger.log(tinkoffClientV2._GetLastPrices([figi].concat()))
  const {ticker,name} = tinkoffClientV2._GetInstrumentBy('INSTRUMENT_ID_TYPE_FIGI',null,figi).instrument
  return [ticker,name]
}

//Работаю над поиском по тикеру Ну вроде работает

function getFigiByTicker(ticker="HHRU") {
  results=''
  while (results=='') {
    //Logger.log(ticker)
    results = tinkoffClientV2._FindInstrument(ticker)["instruments"];
    if (results!='') {
      break
    }
    ticker = ticker.slice(0, -1)
  }
  
  len = results.length
  for (i=0; i<len; i++) {
    result = results[i]
    if (result['ticker']==ticker) {
      Logger.log(result['figi'])
      return result['figi']
      
    }
  }
}

function getLastPrice(ticker="HHRU") {
  const figi = getFigiByTicker(ticker)
  if (figi) {
    const data = tinkoffClientV2._GetLastPrices([figi])
    price = Number(data.lastPrices[0].price.units) + data.lastPrices[0].price.nano/1000000000 
    Logger.log(price)
    return price
  }
}


function getAccounts(account_number=0) {
  const data = tinkoffClientV2._GetAccounts();
  const account = data['accounts'][account_number];
  const accountId = account['id'];
  const accountName = account['name'];
  //Logger.log(data);
  Logger.log('Счет: #' + accountId + ' ' + accountName)
  return accountId
}



function exchangeRate(currency='rub') {
  if (currency == 'rub'){
    return 1
  };
  dict = {
    'usd':'USD000UTSTOM',
    'eur':"EUR_RUB__TOM",
  }
  price = tinkoffClientV2._GetLastPrices([dict['usd']]).lastPrices[0].price
  a = Number(price.units)
  b = price.nano/1000000000
  a = a + b
  //Logger.log(a)
  return 
}

function getPortfolio(account_number=3) {
  const portfolio = tinkoffClientV2._GetPortfolio(getAccounts(account_number));
  const values = []
  values.push(["FIGI","Название","Тип","Кол-во",/*"Ср.цена покупки",*/"Тек.цена",/*"Доходность",*/"НКД","Итого",/*"Валюта",*/"Валюта"/*,"Валюта"*/,"Итого RUB"]);
  Logger.log(values)
  for (let i=0; i<portfolio.positions.length; i++) {
    
    const [ticker,name] = getTickerNameByFIGI(portfolio.positions[i].figi);
    const instrumentType = portfolio.positions[i].instrumentType
    const units = Number(portfolio.positions[i].quantity.units) + portfolio.positions[i].quantity.nano/1000000000
    const currentPrice = Number(portfolio.positions[i].currentPrice.units) + portfolio.positions[i].currentPrice.nano/1000000000
    const yyield = Number(portfolio.positions[i].currentNkd.units) + portfolio.positions[i].currentNkd.nano/1000000000;
    const total = Math.round((units*currentPrice) * 100) / 100;
    const currency = portfolio.positions[i].currentPrice.currency;
    const totalRub = Math.round((total*exchangeRate(currency)) * 100) / 100;

    const item = [ticker,name,instrumentType,units,currentPrice,yyield,total,currency,totalRub]
    
    Logger.log(item)
    values.push(item)
    
    
  }
  return values
}
