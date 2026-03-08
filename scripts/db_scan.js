const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://yuntwerxahgmaoduxvqc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bnR3ZXJ4YWhnbWFvZHV4dnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3OTk4OTMsImV4cCI6MjA3MTM3NTg5M30.1mFUH9yp55uxN8n9tyRHLFbve36_kpaJs41nPU85S74";

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepScan() {
  console.log("🔍 Starting Deep Scan of Supabase Database...");

  const tablesToScan = [
    'questions', 'subjects', 'topics', 'subtopics', 
    'quizzes', 'exam_categories', 'tags', 'categories',
    'quiz_questions', 'subject_mapping', 'exam_types'
  ];

  for (const table of tablesToScan) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
        } else {
          console.log(`❌ Table [${table}]: Error - ${error.message}`);
        }
      } else {
        console.log(`✅ Table [${table}]: Found! (${count} total rows)`);
        if (data && data.length > 0) {
          console.log(`   Sample Data:`, JSON.stringify(data[0], null, 2));
        }
      }
    } catch (err) {
      // Skip
    }
  }
}

deepScan();