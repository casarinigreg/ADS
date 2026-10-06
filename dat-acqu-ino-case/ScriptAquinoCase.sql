create database dataqui;
use dataqui;

create table medida (
idMedida int primary key auto_increment,
lm35_temp float,
chave INT,
momento timestamp default current_timestamp,
fk_sala INT,
constraint fkMedidaSala foreign key (fk_sala) references sala(idSala)
);

create table sala (
idSala INT PRIMARY KEY AUTO_INCREMENT,
nome varchar(10)
);

insert into sala values
	(default, 'Sala 1'),
	(default, 'Sala 2'),
	(default, 'Sala 3');

CREATE USER 'user_insert'@'localhost' IDENTIFIED BY 'senhadata';
GRANT INSERT ON dataqui.* TO 'user_insert'@'localhost';

select * from medida;
truncate table medida;
