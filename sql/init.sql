-- OPC 军师数据库初始化（MySQL 8+）
-- 请先创建数据库，并在该数据库中执行本文件。

CREATE TABLE IF NOT EXISTS users (
  uuid CHAR(36) PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_login_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_login_codes (
  email VARCHAR(254) PRIMARY KEY,
  code_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 附件归档：一条附件一条记录，当前前端只写入、不从此表读取。
CREATE TABLE IF NOT EXISTS attachment_archives (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '归档记录自增 ID',
  uuid CHAR(36) NOT NULL COMMENT '业务 UUID，可对应多条归档记录',
  user_uuid CHAR(36) NOT NULL COMMENT '所属用户 UUID',
  client_project_uuid CHAR(36) NOT NULL COMMENT '前端项目 UUID',
  client_attachment_uuid VARCHAR(128) NOT NULL COMMENT '前端附件 UUID',
  object_storage_path VARCHAR(512) NULL COMMENT '对象存储文件路径，例如 COS Key',
  file_name VARCHAR(255) NOT NULL COMMENT '附件原始文件名',
  file_size VARCHAR(32) NOT NULL COMMENT '附件大小，保留展示值，例如 1.2 MB',
  analyzed_file_content LONGTEXT NOT NULL COMMENT '附件解析后的文本内容',
  ai_dashboard_feedback LONGTEXT NULL COMMENT 'AI 仪表盘分析结果 JSON',
  ai_report_stream_feedback LONGTEXT NULL COMMENT 'AI 对话流反馈及历史消息 JSON',
  optimization_plan_questions_answers LONGTEXT NULL COMMENT '优化商业计划的问题与回答 JSON',
  ai_business_plan_v2_content LONGTEXT NULL COMMENT 'AI 生成的商业计划 v2 JSON',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '首次归档时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '最后更新时间',
  CONSTRAINT fk_attachment_archives_user FOREIGN KEY (user_uuid) REFERENCES users(uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='附件及 AI 产物归档表，仅写入备份，当前页面不读取';
