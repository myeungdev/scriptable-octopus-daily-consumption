const apiKey = '<YOUR_API_KEY>' // Your API key
const mpan = '<MPAN>' // Your electricity meterpoint's MPAN
const serialNumber = '<SERIAL_NUMBER>' // Your electricity meter's serial number

const productCode = 'AGILE-FLEX-22-11-25'
const tariffCode = 'E-1R-AGILE-FLEX-22-11-25-G'

let tariffByHalfHour;

const getYesterdaysDatetime = () => {
  const today = new Date(); // Get current date
  const yesterday = new Date(today); // Copy current date

  yesterday.setDate(today.getDate() - 1); // Set date to yesterday

  const year = yesterday.getFullYear(); // Extract year
  const month = (yesterday.getMonth() + 1).toString().padStart(2, '0'); // Extract month (adjusted because month is zero-indexed)
  const day = yesterday.getDate().toString().padStart(2, '0'); // Extract day
  const yesterdayStart = year + "-" + month + "-" + day + "T00:00:00Z"; // Format datetime
  const yesterdayEnd = year + "-" + month + "-" + day + "T23:59:59Z"; // Format datetime

  return [yesterdayStart, yesterdayEnd];
}

const getCostByDatetime = (dt) => {
  const datetime = new Date(dt)

  const tariff = tariffByHalfHour.find(({ valid_from, valid_to }) => {
    const validFrom = new Date(valid_from)
    const validTo = new Date(valid_to)

    return validFrom >= datetime && datetime <= validTo
  })
  return tariff.value_inc_vat / 100 // to Pound
}

const [period_from, period_to] = getYesterdaysDatetime();

const url = `https://api.octopus.energy/v1/electricity-meter-points/${mpan}/meters/${serialNumber}/consumption/?period_from=${period_from}&period_to=${period_to}`
const tariffUrl = `https://api.octopus.energy/v1/products/${productCode}/electricity-tariffs/${tariffCode}/standard-unit-rates/?period_from=${period_from}&period_to=${period_to}`


let request = new Request(tariffUrl)
let result  = await request.loadJSON()

if (result?.count !== 48 || result.results?.length !== 48) {
  throw new Error(`Invalid tariff data. ${JSON.stringify(result)}`)
}

tariffByHalfHour = result.results;

request = new Request(url)

const base64ApiKey = Data.fromString(apiKey).toBase64String();
request.headers = { 
  "Authorization": `Basic ${base64ApiKey}`,
}

result  = await request.loadJSON()

if (result?.count !== 48 || result.results?.length !== 48) {
  throw new Error(`Invalid consumption data. ${JSON.stringify(result)}`)
}

let totalConsumption = 0
let totalCost = 0;

result.results.forEach(({ consumption, interval_start, interval_end }) => {
  totalConsumption += consumption;
  totalCost += consumption * getCostByDatetime(interval_start)
})

let n = new Notification()

n.title = "Daily Energy"
n.body = `Your yesterday's energy consumption is ${totalConsumption.toFixed(2)}kWh, which costs £${totalCost.toFixed(2)}.`

n.schedule()

Script.complete();
