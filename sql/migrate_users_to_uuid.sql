-- 将旧版 users（email 为主键）迁移为 UUID 主键。
-- 仅在已有旧表且该表尚无 uuid 字段时执行一次。

ALTER TABLE users ADD COLUMN uuid CHAR(36) NULL FIRST;
UPDATE users SET uuid = UUID() WHERE uuid IS NULL;
ALTER TABLE users
  MODIFY COLUMN uuid CHAR(36) NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (uuid),
  ADD UNIQUE KEY users_email_unique (email);
