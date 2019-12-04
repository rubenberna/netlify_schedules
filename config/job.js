const jsforce = require('jsforce');
const org = new jsforce.Connection();
const delighted = require('delighted')(process.env.DELIGHTED_API_KEY);

const { SF_USERNAME, SF_PASSWORD } = process.env

module.exports = {
  conn: '',
  errors: [],
  success: [],

  asyncForEach: async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  },

  login: async () => {
    await org.login(SF_USERNAME, SF_PASSWORD, function (err, userInfo) {
      if (err) console.log(err);
      else return conn = org
    })
  },

  query: async q => {
    try {
      const result = await conn.query(q)      
      return result.records
    } catch (error) {
      return error
    }
  },

  splitIntoBatches: async array => {
    const size = 40
    let index = 0
    let id = 0
    let batchesArray = []
    while (index < array.length) {
      batchesArray.push({ batchID: id, records: array.slice(index, size + index) })
      index += size
      id++
    }
    return batchesArray
  },

  runBatch: batch => {    
    batch.records.forEach(record => module.exports.getAccountName(record));
  },

  getAccountName: record => {
    if (!record.AccountId) {
      record.accountName = 'unknown'
      module.exports.sendToDelighted(record)
    }
    else {
      const accountQuery = `SELECT name FROM Account WHERE Id = '${record.AccountId}'`
      conn.query(accountQuery, (err, result) => {
        if (err) send(err)
        record.accountName = result.records[0].Name
        module.exports.sendToDelighted(record)
      })
    }
  },

  sendToDelighted: record => {    
    delighted.person.create({
      email: record.Email,
      name: record.Name,
      properties: { "kantoor": record.accountName }
    }).then(() => {
      module.exports.updateNPSInSalesforce(record)
    }, error => console.log(error.type))
  },

  updateNPSInSalesforce: record => {    
    let nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 42)
    conn.sobject("Contact").update({
      Id: record.Id,
      Next_NPS_date__c: nextDate,
      NPS_emails_sent__c: record.NPS_emails_sent__c === null ? 1 : record.NPS_emails_sent__c + 1
    }, (err, ret) => {
        if (err || !ret.success) console.log(err);
        else console.log(ret.id);
    })
  },

  updateContractRecord: async record => {
    await conn.sobject("Contact").update({
      Id: record.Id,
      Reminders__c: record.Reminders__c === null || 0 ? 1 : record.Reminders__c + 1,
    }, (err, ret) => {
      if (err || !ret.success) return errors = [...errors, err]
      else return success = [...success, ret.id]
    })
  }
}
