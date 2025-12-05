import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InsightsGateway } from './insights.gateway';
import { InsightsService } from './insights.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [InsightsGateway, InsightsService],
})
export class AppModule {}
