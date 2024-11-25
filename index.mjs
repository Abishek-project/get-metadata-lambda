import { createConnection } from 'mysql2/promise';

const userName = process.env.dbUser;
const password = process.env.dbPassword;
const rdsHost = process.env.dbHost;
const dbName = process.env.dbName;
let connection;

const initDbConnection = async () => {
  try {
    connection = await createConnection({
      host:  rdsHost,
      user: userName,
      password:password,
    });
    console.log('SUCCESS: Connection to RDS for MySQL instance succeeded');
  } catch (error) {
    console.error('ERROR: Failed to connect to MySQL instance.');
    console.error(error.message);
    throw {
      statusCode: 500,
      message: 'ERROR: Failed to connect to MySQL instance.',
      error: error.message,
      stack: error.stack, 
    };
  }
};
export async function handler(event) {
  try {
    if (!connection) {
      console.log('INFO: Initializing database connection...');
      await initDbConnection();
    }
    console.log('Full Event:', JSON.stringify(event, null, 2)); 
    console.log('Full Event:',event); 
     const body = event.isBase64Encoded
     ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'))
     : JSON.parse(event.body);
   console.log('Parsed body:', body);
   const userId = body.userId;
    if (!userId) {
      console.log('ERROR: userId is missing in the request body');
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Bad Request: userId is required.',
        }),
      };
    }
    console.log(`INFO: Processing request for userId: ${userId}`);
    try {
      console.log(`INFO: Switching to database ${dbName}...`);
      await connection.query(`USE ${dbName}`);
    } catch (error) {
      console.error(`ERROR: Failed to switch to database ${dbName}`);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: `Failed to use database ${dbName}.`,
          error: error.message,
        }),
      };
    }
    const selectQuery = `SELECT * FROM images WHERE user_id = ?`;
    console.log(`INFO: Running query: ${selectQuery} with userId: ${userId}`);
    const [results] = await connection.execute(selectQuery, [userId]);
    if (results.length === 0) {
      console.log(`INFO: No metadata found for userId: ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `No metadata found for userId: ${userId}`,
        }),
      };
    }
    console.log(`INFO: Metadata retrieved successfully for userId: ${userId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Metadata retrieved successfully.',
        data: results, 
      }),
    };
  } catch (error) {
    console.error('ERROR: An unexpected error occurred during the request.');
    console.error(error.message);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({
        message: error.message || 'Internal Server Error',
        error: error.error || error.message,
        stack: error.stack, 
      }),
    };
  } finally {
    if (connection) {
      console.log('INFO: Closing the database connection...');
      await connection.end();
      connection = null;
    }
  }
}
 